        public async Task<ActionResult> ProcessPendingReservationNotifications()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            int processedCount = 0;
            var startTime = DateTime.Now;
            var logMessages = new List<string>();

            // Configuration depuis Web.config
            var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
            var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];

            try
            {
                logMessages.Add($"Demarrage traitement notifications OneSignal - {startTime:HH:mm:ss}");

                using (var httpClient = new HttpClient())
                {
                    // HEADERS SUPABASE
                    httpClient.DefaultRequestHeaders.Clear();
                    httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    logMessages.Add("Recuperation reservations pending + scheduled...");

                    // 1. Recuperer reservations pending ET scheduled non notifiees
                    var resUrl =
$"{supabaseUrl}/rest/v1/reservations?statut=in.(pending,scheduled)&notified_at=is.null&select=id,depart_nom,destination_nom,vehicle_type,position_depart,prix_total,created_at";

                    var resResponse = await httpClient.GetStringAsync(resUrl);
                    var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                    logMessages.Add($"{reservations.Length} reservation(s) pending + scheduled trouvee(s)");

                    if (reservations.Length == 0)
                    {
                        return new JsonResult
                        {
                            Data = new
                            {
                                success = true,
                                processed = 0,
                                message = "Aucune reservation pending",
                                logs = logMessages,
                                duration = (DateTime.Now - startTime).TotalSeconds
                            },
                            JsonRequestBehavior = JsonRequestBehavior.AllowGet
                        };
                    }

                    foreach (var res in reservations)
                    {
                        try
                        {
                            logMessages.Add($"Traitement reservation: {res.id} - Type: {res.vehicle_type}");

                            // 2. Trouver conducteurs compatibles dans 5km
                            var condUrl = $"{supabaseUrl}/rest/v1/rpc/find_nearby_conducteurs_by_vehicle";

                            // Convertir position WKB vers format text lisible
                            string positionText = null;
                            try
                            {
                                // Si c'est du WKB, le convertir via une requete Supabase
                                var convertUrl = $"{supabaseUrl}/rest/v1/rpc/st_astext";
                                var convertPayload = new { geom = res.position_depart?.ToString() };
                                var convertContent = new StringContent(
                                    JsonConvert.SerializeObject(convertPayload),
                                    Encoding.UTF8,
                                    "application/json"
                                );

                                var convertResponse = await httpClient.PostAsync(convertUrl, convertContent);
                                if (convertResponse.IsSuccessStatusCode)
                                {
                                    positionText = await convertResponse.Content.ReadAsStringAsync();
                                    positionText = positionText.Trim('"'); // Enlever les guillemets JSON
                                    logMessages.Add($"Position convertie: {positionText}");
                                }
                                else
                                {
                                    // Fallback: utiliser directement la position brute
                                    positionText = res.position_depart?.ToString();
                                    logMessages.Add($"Conversion position echouee, utilisation directe");
                                }
                            }
                            catch (Exception convEx)
                            {
                                positionText = res.position_depart?.ToString();
                                logMessages.Add($"Erreur conversion position: {convEx.Message}");
                            }

                            var condPayload = new
                            {
                                p_position_depart = positionText,
                                p_vehicle_type = res.vehicle_type?.ToString(),
                                p_max_distance_km = 5
                            };

                            logMessages.Add($"Appel fonction Supabase: {condUrl}");
                            logMessages.Add($"Position: {res.position_depart}");
                            logMessages.Add($"Type vehicule: {res.vehicle_type}");

                            var condContent = new StringContent(
                                JsonConvert.SerializeObject(condPayload),
                                Encoding.UTF8,
                                "application/json"
                            );

                            var condResponse = await httpClient.PostAsync(condUrl, condContent);
                            var condResult = await condResponse.Content.ReadAsStringAsync();

                            logMessages.Add($"Status Code: {condResponse.StatusCode}");
                            logMessages.Add($"Response Length: {condResult?.Length ?? 0}");
                            logMessages.Add($"Raw Response: {condResult}");

                            // Verifier le format de la reponse avant deserialisation
                            dynamic[] conducteurs;
                            try
                            {
                                if (string.IsNullOrWhiteSpace(condResult) || condResult.Trim() == "[]")
                                {
                                    logMessages.Add("Reponse vide - Aucun conducteur trouve");
                                    conducteurs = new dynamic[0];
                                }
                                else if (condResult.TrimStart().StartsWith("{"))
                                {
                                    logMessages.Add("ERREUR: Reponse est un objet, pas un tableau");
                                    logMessages.Add($"Contenu objet: {condResult}");

                                    // Essayer de parser l'erreur
                                    var errorObj = JsonConvert.DeserializeObject<dynamic>(condResult);
                                    logMessages.Add($"Erreur Supabase: {errorObj}");

                                    conducteurs = new dynamic[0];
                                }
                                else
                                {
                                    conducteurs = JsonConvert.DeserializeObject<dynamic[]>(condResult);
                                    logMessages.Add($"Deserialisation reussie: {conducteurs.Length} conducteurs");
                                }
                            }
                            catch (Exception deserializeEx)
                            {
                                logMessages.Add($"ERREUR DESERIALISATION: {deserializeEx.Message}");
                                logMessages.Add($"Type exception: {deserializeEx.GetType().Name}");

                                if (!string.IsNullOrEmpty(condResult))
                                {
                                    logMessages.Add($"Premier caractere: '{condResult[0]}'");
                                    logMessages.Add($"Dernier caractere: '{condResult[condResult.Length - 1]}'");
                                    logMessages.Add($"Contient 'error': {condResult.Contains("error")}");
                                    logMessages.Add($"Contient 'message': {condResult.Contains("message")}");
                                }

                                conducteurs = new dynamic[0];
                            }

                            logMessages.Add($"{conducteurs.Length} conducteur(s) {res.vehicle_type} trouve(s) dans 5km");

                            if (conducteurs.Length > 0)
                            {
                                // 3. Envoyer notification OneSignal a chaque conducteur
                                // Format moderne avec fleche pour depart -> destination
                                var message = $"{res.depart_nom} -> {res.destination_nom}";
                                var notificationsSent = 0;

                                foreach (var cond in conducteurs)
                                {
                                    try
                                    {
                                        var success = SendNewReservationNotificationToConducteurs(
                                            cond.id.ToString(),
                                            message,
                                            res.vehicle_type?.ToString()
                                        );

                                        if (success)
                                        {
                                            notificationsSent++;
                                            // JOUER CLAXON apres notification reussie
                                            PlayClaxonSound();

                                            logMessages.Add($"Notification + Claxon envoye a {cond.nom} ({cond.distance_km}km)");
                                        }
                                        else
                                        {
                                            logMessages.Add($"ECHEC notification pour {cond.nom} - Verifier OneSignal");
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        logMessages.Add($"Erreur notification {cond.nom}: {ex.Message}");
                                    }
                                }

                                // 4. Marquer reservation comme notifiee
                                if (notificationsSent > 0)
                                {
                                    var updateUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{res.id}";
                                    var updatePayload = new { notified_at = DateTime.UtcNow };
                                    var updateContent = new StringContent(
                                        JsonConvert.SerializeObject(updatePayload),
                                        Encoding.UTF8,
                                        "application/json"
                                    );

                                    httpClient.DefaultRequestHeaders.Remove("Prefer");
                                    httpClient.DefaultRequestHeaders.Add("Prefer", "return=minimal");

                                    var updateResponse = await httpClient.SendAsync(new HttpRequestMessage(new HttpMethod("PATCH"), updateUrl)
                                    {
                                        Content = updateContent
                                    });

                                    if (updateResponse.IsSuccessStatusCode)
                                    {
                                        logMessages.Add($"Reservation {res.id} marquee comme notifiee");
                                        processedCount++;
                                    }
                                }
                            }
                            else
                            {
                                logMessages.Add($"Aucun conducteur {res.vehicle_type} disponible dans 5km");
                            }

                            // Delai pour eviter le spam
                            await Task.Delay(500);
                        }
                        catch (Exception ex)
                        {
                            logMessages.Add($"Erreur reservation {res.id}: {ex.Message}");
                        }
                    }
                }

                var duration = (DateTime.Now - startTime).TotalSeconds;
                var resultMessage = $"Traitement termine: {processedCount} reservation(s) traitee(s) en {duration:F1}s";
                logMessages.Add(resultMessage);

                return new JsonResult
                {
                    Data = new
                    {
                        success = true,
                        processed = processedCount,
                        message = resultMessage,
                        logs = logMessages,
                        duration = duration
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
            catch (Exception ex)
            {
                var duration = (DateTime.Now - startTime).TotalSeconds;
                logMessages.Add($"ERREUR GLOBALE: {ex.Message}");

                return new JsonResult
                {
                    Data = new
                    {
                        success = false,
                        processed = 0,
                        message = $"Erreur: {ex.Message}",
                        logs = logMessages,
                        duration = duration,
                        stackTrace = ex.ToString()
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
        }


        // Methode OneSignal pour envoyer notification External User IDs
        private string FormatModernMessage(string message, string vehicleType = null)
        {
            try
            {
                // Choisir les icônes selon le type de véhicule
                string departIcon = "📍";
                string vehicleIcon = "🎯";
                
                if (!string.IsNullOrEmpty(vehicleType))
                {
                    switch (vehicleType.ToLower())
                    {
                        case "moto":
                            departIcon = "🏍️";
                            vehicleIcon = "🎯";
                            break;
                        case "voiture":
                            departIcon = "🚗";
                            vehicleIcon = "🎯";
                            break;
                        default:
                            departIcon = "📍";
                            vehicleIcon = "🎯";
                            break;
                    }
                }
                
                // Remplacer " -> " par une flèche moderne avec icônes adaptées
                if (message.Contains(" -> "))
                {
                    return message.Replace(" -> ", $" {departIcon}➡️{vehicleIcon} ");
                }
                
                // Si pas de flèche, ajouter juste l'icône de départ
                return $"{departIcon} " + message;
            }
            catch
            {
                return message; // Fallback vers original
            }
        }

        private string GetVehicleTitle(string vehicleType)
        {
            if (!string.IsNullOrEmpty(vehicleType))
            {
                switch (vehicleType.ToLower())
                {
                    case "moto":
                        return "🏍️ Nouvelle Course Moto";
                    case "voiture":
                        return "🚗 Nouvelle Course Voiture";
                    default:
                        return "🚖 Nouvelle Course";
                }
            }
            return "🚖 Nouvelle Course";
        }

        public bool SendNewReservationNotificationToConducteurs(string ConducteurId, string Message, string VehicleType = null)
        {
            try
            {
                // DEBUG: Verifier configuration
                var appId = ConfigurationManager.AppSettings["onesignalAppId"];
                var apiKey = ConfigurationManager.AppSettings["onesignalApiKey"];
                var url = ConfigurationManager.AppSettings["onesignalUrl"];

                Console.WriteLine($"OneSignal Config Check:");
                Console.WriteLine($"  - App ID: {(string.IsNullOrEmpty(appId) ? "MANQUANT" : "OK")}");
                Console.WriteLine($"  - API Key: {(string.IsNullOrEmpty(apiKey) ? "MANQUANT" : "OK")}");
                Console.WriteLine($"  - URL: {(string.IsNullOrEmpty(url) ? "MANQUANT" : url)}");
                Console.WriteLine($"  - External User ID: conducteur_{ConducteurId}");

                if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(url))
                {
                    Console.WriteLine("Configuration OneSignal incomplete");
                    return false;
                }

                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                var request = WebRequest.Create(url) as HttpWebRequest;
                request.KeepAlive = true;
                request.Method = "POST";
                request.ContentType = "application/json; charset=utf-8";
                request.Headers.Add("Authorization", "Key " + ConfigurationManager.AppSettings["onesignalApiKey"]);

                var serializer = new JavaScriptSerializer();
                var obj = new
                {
                    app_id = ConfigurationManager.AppSettings["onesignalAppId"],
                    contents = new
                    {
                        en = FormatModernMessage(Message, VehicleType),
                        fr = FormatModernMessage(Message, VehicleType)
                    },
                    headings = new
                    {
                        en = GetVehicleTitle(VehicleType),
                        fr = GetVehicleTitle(VehicleType)
                    },
                    include_external_user_ids = new string[] { "conducteur_" + ConducteurId },
                    priority = 10,
                    // COULEURS NOTIFICATION
                    android_accent_color = "FF00A651",  // Couleur verte (nouvelle reservation)
                                                        // UTILISER CATEGORY ONESIGNAL AVEC SON PERSONNALISE
                    android_channel_id = ConfigurationManager.AppSettings["onesignalChannelId"],  // Channel cree dans Dashboard
                    android_vibration_pattern = new int[] { 0, 1000, 500, 1000, 500, 1000 },
                    android_led_color = "FF00A651",


                    ttl = 86400,                              // Time-to-live 24h
                    android_group = "nouvelles_courses",

                    data = new
                    {
                        type = "new_reservation",
                        conducteur_id = ConducteurId,
                        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    }
                };

                var param = serializer.Serialize(obj);
                byte[] byteArray = Encoding.UTF8.GetBytes(param);

                string responseContent = null;

                try
                {
                    using (var writer = request.GetRequestStream())
                    {
                        writer.Write(byteArray, 0, byteArray.Length);
                    }

                    using (var response = request.GetResponse() as HttpWebResponse)
                    {
                        using (var reader = new StreamReader(response.GetResponseStream()))
                        {
                            responseContent = reader.ReadToEnd();
                        }
                    }

                    System.Diagnostics.Debug.WriteLine("OneSignal Success: " + responseContent);
                    return true;
                }
                catch (WebException ex)
                {
                    System.Diagnostics.Debug.WriteLine("OneSignal Error: " + ex.Message);

                    // LOG DETAILLE pour debug
                    Console.WriteLine($"OneSignal WebException: {ex.Message}");
                    Console.WriteLine($"Status: {ex.Status}");

                    try
                    {
                        using (var reader = new StreamReader(ex.Response.GetResponseStream()))
                        {
                            string errorResponse = reader.ReadToEnd();
                            System.Diagnostics.Debug.WriteLine("OneSignal Error Response: " + errorResponse);
                            Console.WriteLine($"OneSignal Response: {errorResponse}");
                        }
                    }
                    catch { }
                    return false;
                }
                catch (Exception genEx)
                {
                    Console.WriteLine($"Erreur generale OneSignal: {genEx.Message}");
                    return false;
                }
            }
            catch (Exception configEx)
            {
                Console.WriteLine($"Erreur configuration OneSignal: {configEx.Message}");
                return false;
            }
        }

        // Methode principale pour traiter les reservations annulees
        public async Task<ActionResult> ProcessCancelledReservationNotifications()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            int processedCount = 0;
            var startTime = DateTime.Now;
            var logMessages = new List<string>();

            // Configuration depuis Web.config
            var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
            var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];

            try
            {
                logMessages.Add($"Demarrage traitement ANNULATIONS - {startTime:HH:mm:ss}");

                using (var httpClient = new HttpClient())
                {
                    // CONFIGURATION TIMEOUT ET CONNEXION
                    httpClient.Timeout = TimeSpan.FromSeconds(30);  // Timeout 30s au lieu de defaut

                    // Headers Supabase
                    httpClient.DefaultRequestHeaders.Clear();
                    httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    logMessages.Add("Recuperation reservations annulees...");
                    logMessages.Add($"URL Supabase: {supabaseUrl}");

                    // 1. Recuperer reservations annulees non notifiees  
                    var cancelUrl = $"{supabaseUrl}/rest/v1/reservations?statut=eq.canceled&conducteur_id=not.is.null&cancellation_notified_at=is.null&select=id,conducteur_id,depart_nom,destination_nom,vehicle_type,prix_total,updated_at";

                    logMessages.Add($"Requete: {cancelUrl}");

                    string cancelResponse;
                    try
                    {
                        // SOLUTION DEADLOCK: ConfigureAwait(false) pour eviter blocage
                        cancelResponse = await httpClient.GetStringAsync(cancelUrl).ConfigureAwait(false);
                        logMessages.Add($"Reponse Supabase recue: {cancelResponse?.Length ?? 0} caracteres");
                    }
                    catch (HttpRequestException httpEx)
                    {
                        logMessages.Add($"ERREUR HTTP: {httpEx.Message}");
                        logMessages.Add($"URL testee: {cancelUrl}");
                        throw new Exception($"Erreur connexion Supabase: {httpEx.Message}");
                    }
                    catch (TaskCanceledException timeoutEx)
                    {
                        logMessages.Add($"TIMEOUT apres 30s");
                        logMessages.Add($"Verifiez connectivite reseau vers Supabase");
                        throw new Exception($"Timeout connexion Supabase: {timeoutEx.Message}");
                    }

                    var cancelledReservations = JsonConvert.DeserializeObject<dynamic[]>(cancelResponse);

                    logMessages.Add($"{cancelledReservations.Length} reservation(s) annulee(s) trouvee(s)");

                    if (cancelledReservations.Length == 0)
                    {
                        return new JsonResult
                        {
                            Data = new
                            {
                                success = true,
                                processed = 0,
                                message = "Aucune reservation annulee a traiter",
                                logs = logMessages,
                                duration = (DateTime.Now - startTime).TotalSeconds
                            },
                            JsonRequestBehavior = JsonRequestBehavior.AllowGet
                        };
                    }

                    foreach (var reservation in cancelledReservations)
                    {
                        try
                        {
                            logMessages.Add($"Traitement annulation: {reservation.id}");
                            logMessages.Add($"Conducteur assigne: {reservation.conducteur_id}");
                            logMessages.Add($"Trajet: {reservation.depart_nom} -> {reservation.destination_nom}");

                            // 2. Construire message d'annulation avec format moderne
                            var message = $"{reservation.depart_nom} -> {reservation.destination_nom}";

                            // 3. Envoyer notification OneSignal
                            var success = SendCancellationNotificationToConducteur(
                                reservation.conducteur_id.ToString(),
                                message,
                                reservation.id.ToString()
                            );

                            if (success)
                            {
                                logMessages.Add($"Notification annulation envoyee au conducteur");

                                // 4. Marquer comme notifiee
                                var updateUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservation.id}";
                                var updatePayload = new { cancellation_notified_at = DateTime.UtcNow };
                                var updateContent = new StringContent(
                                    JsonConvert.SerializeObject(updatePayload),
                                    Encoding.UTF8,
                                    "application/json"
                                );

                                httpClient.DefaultRequestHeaders.Remove("Prefer");
                                httpClient.DefaultRequestHeaders.Add("Prefer", "return=minimal");

                                var updateResponse = await httpClient.SendAsync(
                                    new HttpRequestMessage(new HttpMethod("PATCH"), updateUrl)
                                    {
                                        Content = updateContent
                                    }
                                ).ConfigureAwait(false);

                                if (updateResponse.IsSuccessStatusCode)
                                {
                                    logMessages.Add($"Reservation {reservation.id} marquee comme notifiee");
                                    processedCount++;
                                }
                                else
                                {
                                    logMessages.Add($"Echec marquage notification pour {reservation.id}");
                                }
                            }
                            else
                            {
                                logMessages.Add($"Echec envoi notification annulation");
                            }

                            // Delai anti-spam
                            await Task.Delay(500).ConfigureAwait(false);
                        }
                        catch (Exception ex)
                        {
                            logMessages.Add($"Erreur traitement annulation {reservation.id}: {ex.Message}");
                        }
                    }
                }

                var duration = (DateTime.Now - startTime).TotalSeconds;
                var resultMessage = $"Traitement termine: {processedCount} annulation(s) notifiee(s) en {duration:F1}s";
                logMessages.Add(resultMessage);

                return new JsonResult
                {
                    Data = new
                    {
                        success = true,
                        processed = processedCount,
                        message = resultMessage,
                        logs = logMessages,
                        duration = duration
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
            catch (Exception ex)
            {
                var duration = (DateTime.Now - startTime).TotalSeconds;
                logMessages.Add($"ERREUR GLOBALE: {ex.Message}");

                return new JsonResult
                {
                    Data = new
                    {
                        success = false,
                        processed = 0,
                        message = $"Erreur: {ex.Message}",
                        logs = logMessages,
                        duration = duration,
                        stackTrace = ex.ToString()
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
        }

        // Methode specialisee pour notifications d'annulation
        public bool SendCancellationNotificationToConducteur(string conducteurId, string message, string reservationId)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            try
            {
                var request = WebRequest.Create(ConfigurationManager.AppSettings["onesignalUrl"]) as HttpWebRequest;
                request.KeepAlive = true;
                request.Method = "POST";
                request.ContentType = "application/json; charset=utf-8";
                request.Headers.Add("Authorization", "Key " + ConfigurationManager.AppSettings["onesignalApiKey"]);

                var serializer = new JavaScriptSerializer();
                var obj = new
                {
                    app_id = ConfigurationManager.AppSettings["onesignalAppId"],
                    contents = new
                    {
                        en = message,
                        fr = message
                    },
                    headings = new
                    {
                        en = "Course Annulee",
                        fr = "Course Annulee"
                    },
                    include_external_user_ids = new string[] { "conducteur_" + conducteurId },
                    priority = 10,
                    // UTILISER LE MEME CHANNEL AVEC SON PERSONNALISE
                    android_channel_id = ConfigurationManager.AppSettings["onesignalChannelId"],  // Channel cree dans Dashboard
                    android_vibration_pattern = new int[] { 0, 500, 200, 500, 200, 1500 },  // Pattern different pour annulation
                    android_accent_color = "FFFF0000",  // Rouge pour annulation
                    android_led_color = "FFFF0000",     // LED rouge
                    ttl = 86400,                         // Time-to-live 24h
                    android_group = "courses_annulees",  // Groupe separe pour annulations
                    data = new
                    {
                        type = "reservation_cancelled",
                        reservation_id = reservationId,
                        conducteur_id = conducteurId,
                        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    }
                };

                var param = serializer.Serialize(obj);
                byte[] byteArray = Encoding.UTF8.GetBytes(param);

                using (var writer = request.GetRequestStream())
                {
                    writer.Write(byteArray, 0, byteArray.Length);
                }

                using (var response = request.GetResponse() as HttpWebResponse)
                {
                    using (var reader = new StreamReader(response.GetResponseStream()))
                    {
                        var responseContent = reader.ReadToEnd();
                        System.Diagnostics.Debug.WriteLine("OneSignal Cancellation Success: " + responseContent);
                    }
                }

                return true;
            }
            catch (WebException ex)
            {
                System.Diagnostics.Debug.WriteLine("OneSignal Cancellation Error: " + ex.Message);
                try
                {
                    using (var reader = new StreamReader(ex.Response.GetResponseStream()))
                    {
                        string errorResponse = reader.ReadToEnd();
                        System.Diagnostics.Debug.WriteLine("OneSignal Cancellation Error Response: " + errorResponse);
                    }
                }
                catch { }
                return false;
            }
        }

        // Methode de test pour annulation
        public JsonResult TestCancellationNotification(string conducteurId = "69e0cde9-14a0-4dde-86c1-1fe9a306f2fa")
        {
            var message = "Lieusaint -> Paris";
            var success = SendCancellationNotificationToConducteur(
                conducteurId,
                message,
                "test-reservation-id"
            );

            return new JsonResult
            {
                Data = new
                {
                    success = success,
                    message = success ? "Notification annulation envoyee" : "Echec envoi",
                    conducteurId = conducteurId,
                    externalUserId = $"conducteur_{conducteurId}",
                    timestamp = DateTime.UtcNow
                },
                JsonRequestBehavior = JsonRequestBehavior.AllowGet
            };
        }

        // Methode pour traiter JSON du trigger PostgreSQL (garde pour compatibilite)
        public object ProcessNewReservationNotification(System.Web.HttpRequestBase request, string conducteurId = null, string message = null, string vehicleType = null)
        {
            // CAS 1: Parametres GET/POST fournis (test navigateur)
            if (!string.IsNullOrEmpty(conducteurId) && !string.IsNullOrEmpty(message))
            {
                var callback = SendNewReservationNotificationToConducteurs(conducteurId, message, vehicleType);
                return new
                {
                    success = callback,
                    message = "Test notification envoyee",
                    method = "GET/POST parameters",
                    conducteurId = conducteurId,
                    vehicleType = vehicleType
                };
            }

            // CAS 2: JSON du trigger (pour compatibilite)
            try
            {
                var requestBody = new StreamReader(request.InputStream).ReadToEnd();

                if (string.IsNullOrEmpty(requestBody))
                {
                    return new
                    {
                        success = false,
                        message = "Utilisez ProcessPendingReservationNotifications() pour le traitement automatique"
                    };
                }

                var serializer = new JavaScriptSerializer();
                var notificationRequest = serializer.Deserialize<dynamic>(requestBody);

                return new
                {
                    success = true,
                    message = "Utilisez ProcessPendingReservationNotifications() pour le traitement automatique",
                    method = "JSON deprecated - use ProcessPendingReservationNotifications"
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = "Erreur: " + ex.Message
                };
            }
        }


        public async Task<ActionResult> ProcessScheduledReservationReminders()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            int reminders4hSent = 0;
            int reminders3hSent = 0;
            var startTime = DateTime.Now;
            var logMessages = new List<string>();

            // Configuration
            var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
            var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];
            var oneSignalAppId = ConfigurationManager.AppSettings["onesignalAppId"];
            var oneSignalApiKey = ConfigurationManager.AppSettings["onesignalApiKey"];
            var oneSignalUrl = ConfigurationManager.AppSettings["onesignalUrl"];
            var channelId = ConfigurationManager.AppSettings["onesignalChannelId"];

            try
            {
                logMessages.Add($"Demarrage traitement rappels - {startTime:HH:mm:ss}");

                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Clear();
                    httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                    var currentTimeUtc = DateTime.UtcNow;

                    // TRAITER LES 2 TYPES DE RAPPELS EN UNE SEULE BOUCLE
                    var reminders = new[]
                    {
                        new { Hours = 4, Field = "reminder_4h_sent_at", Title = "Rappel Course - 4H", Priority = "normal" },
                        new { Hours = 3, Field = "reminder_3h_sent_at", Title = "COURSE URGENTE - 3H", Priority = "urgent" }
                    };

                    foreach (var reminder in reminders)
                    {
                        logMessages.Add($"[{reminder.Hours}H] Recherche reservations...");

                        // Construire requete selon le type de rappel
                        var whereClause = reminder.Hours == 4
                            ? "reminder_4h_sent_at=is.null"
                            : "reminder_4h_sent_at=not.is.null&reminder_3h_sent_at=is.null";

                        var resUrl = $"{supabaseUrl}/rest/v1/reservations?" +
                                    $"statut=eq.accepted&" +
                                    $"conducteur_id=not.is.null&" +
                                    $"date_reservation=not.is.null&" +
                                    $"heure_reservation=not.is.null&" +
                                    $"{whereClause}&" +
                                    $"select=id,client_phone,conducteur_id,vehicle_type,depart_nom,destination_nom," +
                                    $"date_reservation,heure_reservation,minute_reservation,prix_total";

                        var resResponse = await httpClient.GetStringAsync(resUrl);
                        var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                        logMessages.Add($"[{reminder.Hours}H] {reservations.Length} reservation(s) trouvee(s)");

                        foreach (var res in reservations)
                        {
                            try
                            {
                                // Calculer timing reservation
                                var resDate = DateTime.Parse(res.date_reservation.ToString());
                                var resHour = (int)res.heure_reservation;
                                var resMinute = res.minute_reservation != null ? (int)res.minute_reservation : 0;
                                var reservationDateTime = resDate.AddHours(resHour).AddMinutes(resMinute);

                                var hoursUntilReservation = (reservationDateTime - currentTimeUtc).TotalHours;

                                // Verifier fenetre temporelle (±15 minutes)
                                var minHours = reminder.Hours - 0.25;
                                var maxHours = reminder.Hours + 0.25;

                                if (hoursUntilReservation >= minHours && hoursUntilReservation <= maxHours)
                                {
                                    var departInfo = res.depart_nom?.ToString() ?? "Position GPS";
                                    var destInfo = res.destination_nom?.ToString() ?? "Destination";

                                    // Message adapte selon urgence
                                    string message;
                                    if (reminder.Priority == "urgent")
                                    {
                                        message = $"{res.vehicle_type?.ToString().ToUpper()} - Depart dans {reminder.Hours}H !\n" +
                                                 $"{departInfo} -> {destInfo}\n" +
                                                 $"{resHour:00}h{resMinute:00} • {res.prix_total:N0} GNF\n" +
                                                 $"{res.client_phone}";
                                    }
                                    else
                                    {
                                        message = $"{res.vehicle_type?.ToString().ToUpper()} - Depart dans {reminder.Hours}H\n" +
                                                 $"{departInfo} -> {destInfo}\n" +
                                                 $"{resHour:00}h{resMinute:00} • {res.prix_total:N0} GNF\n" +
                                                 $"{res.client_phone}";
                                    }

                                    // ENVOYER NOTIFICATION ONESIGNAL
                                    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                                    var request = WebRequest.Create(oneSignalUrl) as HttpWebRequest;
                                    request.KeepAlive = true;
                                    request.Method = "POST";
                                    request.ContentType = "application/json; charset=utf-8";
                                    request.Headers.Add("Authorization", "Key " + oneSignalApiKey);

                                    var serializer = new JavaScriptSerializer();
                                    var notification = new
                                    {
                                        app_id = oneSignalAppId,
                                        include_external_user_ids = new[] { $"conducteur_{res.conducteur_id}" },
                                        channel_for_external_user_ids = "push",
                                        contents = new { en = message },
                                        headings = new { en = reminder.Title },
                                        data = new
                                        {
                                            type = $"reminder_{reminder.Hours}h",
                                            reservation_id = res.id.ToString(),
                                            conducteur_id = res.conducteur_id.ToString()
                                        },
                                        android_channel_id = channelId, // Channel avec claxon configure
                                        priority = 10,
                                        ttl = 3600
                                    };

                                    var param = serializer.Serialize(notification);
                                    byte[] byteArray = Encoding.UTF8.GetBytes(param);

                                    using (var writer = request.GetRequestStream())
                                    {
                                        writer.Write(byteArray, 0, byteArray.Length);
                                    }

                                    bool notifSuccess = false;
                                    using (var response = request.GetResponse() as HttpWebResponse)
                                    {
                                        notifSuccess = response.StatusCode == HttpStatusCode.OK;
                                    }

                                    if (notifSuccess)
                                    {
                                        // MARQUER COMME ENVOYE
                                        var updateUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{res.id}";

                                        object updatePayload;
                                        if (reminder.Hours == 4)
                                        {
                                            updatePayload = new { reminder_4h_sent_at = DateTime.UtcNow };
                                        }
                                        else
                                        {
                                            updatePayload = new { reminder_3h_sent_at = DateTime.UtcNow };
                                        }

                                        var updateJson = JsonConvert.SerializeObject(updatePayload);

                                        // Utiliser WebRequest au lieu de HttpClient.PatchAsync
                                        var updateRequest = WebRequest.Create(updateUrl) as HttpWebRequest;
                                        updateRequest.Method = "PATCH";
                                        updateRequest.ContentType = "application/json";
                                        updateRequest.Headers.Add("apikey", supabaseKey);
                                        updateRequest.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                                        updateRequest.Headers.Add("Prefer", "return=minimal");

                                        byte[] updateBytes = Encoding.UTF8.GetBytes(updateJson);
                                        using (var updateStream = updateRequest.GetRequestStream())
                                        {
                                            updateStream.Write(updateBytes, 0, updateBytes.Length);
                                        }

                                        using (var updateResponse = updateRequest.GetResponse())
                                        {
                                            // Update reussi
                                        }

                                        if (reminder.Hours == 4) reminders4hSent++;
                                        else reminders3hSent++;

                                        logMessages.Add($"[{reminder.Hours}H] Notification envoyee - Reservation {res.id}");
                                    }
                                    else
                                    {
                                        logMessages.Add($"[{reminder.Hours}H] Echec notification {res.id}");
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                logMessages.Add($"[{reminder.Hours}H] Erreur {res.id}: {ex.Message}");
                            }
                        }
                    }
                }

                logMessages.Add($"Termine: {reminders4hSent} rappels 4H, {reminders3hSent} rappels 3H");

                return new JsonResult
                {
                    Data = new
                    {
                        success = true,
                        reminders_4h = reminders4hSent,
                        reminders_3h = reminders3hSent,
                        total = reminders4hSent + reminders3hSent,
                        message = $"{reminders4hSent + reminders3hSent} rappel(s) envoye(s)",
                        logs = logMessages,
                        duration = (DateTime.Now - startTime).TotalSeconds
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
            catch (Exception ex)
            {
                logMessages.Add($"ERREUR: {ex.Message}");

                return new JsonResult
                {
                    Data = new
                    {
                        success = false,
                        error = ex.Message,
                        logs = logMessages,
                        duration = (DateTime.Now - startTime).TotalSeconds
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
        }

        #region 'claxon audio '

        // METHODE AUDIO CLAXON
        private void PlayClaxonSound()
        {
            try
            {
                // Chemin vers fichier audio claxon
                string claxonPath = HttpContext.Current.Server.MapPath("~/Sounds/claxon.wav");

                if (System.IO.File.Exists(claxonPath))
                {
                    var player = new System.Media.SoundPlayer(claxonPath);
                    player.Play(); // Non-bloquant
                    System.Diagnostics.Debug.WriteLine("Claxon joue");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("Fichier claxon introuvable: " + claxonPath);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur audio claxon: {ex.Message}");
                // Ne pas faire echouer le processus principal
            }
        }


        // METHODE DE TEST AUDIO CLAXON
        public JsonResult TestClaxonSound()
        {
            try
            {
                PlayClaxonSound();
                return new JsonResult
                {
                    Data = new
                    {
                        success = true,
                        message = "Claxon joue avec succes",
                        timestamp = DateTime.UtcNow,
                        filePath = HttpContext.Current.Server.MapPath("~/Sounds/claxon.wav")
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
            catch (Exception ex)
            {
                return new JsonResult
                {
                    Data = new
                    {
                        success = false,
                        message = $"Erreur: {ex.Message}",
                        timestamp = DateTime.UtcNow
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
        }

        #endregion

        #region 'Multi-Provider WhatsApp Support'

        // METHODE PRINCIPALE MULTI-PROVIDER
        public async Task<bool> SendWhatsAppMessage(string clientPhone, string message, List<string> logMessages = null)
        {
            if (logMessages == null) logMessages = new List<string>();
            
            // Configuration multi-provider
            var whatsappProvider = ConfigurationManager.AppSettings["WhatsApp:Provider"] ?? "twilio";
            
            logMessages.Add($"Envoi WhatsApp via {whatsappProvider}");
            
            if (whatsappProvider == "greenapi")
            {
                var greenApiInstanceId = ConfigurationManager.AppSettings["GreenAPI:InstanceId"];
                var greenApiToken = ConfigurationManager.AppSettings["GreenAPI:Token"];
                var greenApiBaseUrl = ConfigurationManager.AppSettings["GreenAPI:BaseUrl"] ?? "https://api.green-api.com";
                
                return await SendViaGreenAPI(clientPhone, message, greenApiInstanceId, greenApiToken, greenApiBaseUrl, logMessages);
            }
            else
            {
                var twilioSid = ConfigurationManager.AppSettings["Twilio:Sid"];
                var twilioToken = ConfigurationManager.AppSettings["Twilio:Token"];
                var twilioNumber = ConfigurationManager.AppSettings["Twilio:Number"];
                
                return await SendViaTwilio(clientPhone, message, twilioSid, twilioToken, twilioNumber, logMessages);
            }
        }

        // METHODE HELPER POUR ENVOYER VIA GREEN API
        private async Task<bool> SendViaGreenAPI(string clientPhone, string message, string instanceId, string token, string baseUrl, List<string> logMessages)
        {
            try
            {
                if (string.IsNullOrEmpty(instanceId) || string.IsNullOrEmpty(token))
                {
                    logMessages.Add("Configuration Green API manquante");
                    return false;
                }

                // Normaliser le numero pour Green API (format international sans +)
                var normalizedPhone = NormalizePhoneForGreenAPI(clientPhone);
                if (string.IsNullOrEmpty(normalizedPhone))
                {
                    logMessages.Add($"Impossible de normaliser le numero: {clientPhone}");
                    return false;
                }

                // 🔧 FORMATAGE SPÉCIAL GREEN API - Nettoyer les caractères problématiques
                var cleanMessage = FormatMessageForGreenAPI(message);

                using (var httpClient = new HttpClient())
                {
                    var greenApiUrl = $"{baseUrl}/waInstance{instanceId}/sendMessage/{token}";
                    
                    var payload = new
                    {
                        chatId = $"{normalizedPhone}@c.us",
                        message = cleanMessage
                    };

                    var jsonPayload = JsonConvert.SerializeObject(payload);
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                    logMessages.Add($"Envoi Green API vers: {normalizedPhone}");
                    
                    var response = await httpClient.PostAsync(greenApiUrl, content);
                    var responseContent = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        logMessages.Add($"WhatsApp Green API envoye a {clientPhone}");
                        logMessages.Add($"Reponse Green API: {responseContent}");
                        return true;
                    }
                    else
                    {
                        logMessages.Add($"Erreur Green API {response.StatusCode}: {responseContent}");
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                logMessages.Add($"Exception Green API: {ex.Message}");
                return false;
            }
        }

        // METHODE HELPER POUR ENVOYER VIA TWILIO
        private async Task<bool> SendViaTwilio(string clientPhone, string message, string twilioSid, string twilioToken, string twilioNumber, List<string> logMessages)
        {
            try
            {
                if (string.IsNullOrEmpty(twilioSid) || string.IsNullOrEmpty(twilioToken) || string.IsNullOrEmpty(twilioNumber))
                {
                    logMessages.Add("Configuration Twilio manquante");
                    return false;
                }

                // Normaliser le numero pour Twilio (format international avec +)
                var normalizedPhone = NormalizePhoneForTwilio(clientPhone);
                if (string.IsNullOrEmpty(normalizedPhone))
                {
                    logMessages.Add($"Impossible de normaliser le numero: {clientPhone}");
                    return false;
                }

                using (var twilioClient = new HttpClient())
                {
                    var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{twilioSid}:{twilioToken}"));
                    twilioClient.DefaultRequestHeaders.Add("Authorization", $"Basic {credentials}");

                    var formData = new FormUrlEncodedContent(new[]
                    {
                        new KeyValuePair<string, string>("From", $"whatsapp:{twilioNumber}"),
                        new KeyValuePair<string, string>("To", $"whatsapp:{normalizedPhone}"),
                        new KeyValuePair<string, string>("Body", message)
                    });

                    logMessages.Add($"Envoi Twilio vers: {normalizedPhone}");

                    var response = await twilioClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json", formData);

                    if (response.IsSuccessStatusCode)
                    {
                        logMessages.Add($"WhatsApp Twilio envoye a {clientPhone}");
                        return true;
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        logMessages.Add($"Erreur Twilio {response.StatusCode}: {errorContent}");
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                logMessages.Add($"Exception Twilio: {ex.Message}");
                return false;
            }
        }

        // NORMALISATION NUMERO POUR GREEN API (sans +)
        private string NormalizePhoneForGreenAPI(string phone)
        {
            if (string.IsNullOrEmpty(phone)) return null;

            // Enlever tous les espaces et caracteres speciaux
            phone = phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Replace(".", "");

            // Enlever le + si present
            if (phone.StartsWith("+"))
            {
                phone = phone.Substring(1);
            }

            // Si commence par 00, enlever
            if (phone.StartsWith("00"))
            {
                phone = phone.Substring(2);
            }

            // Si commence par 224 (Guinee), c'est bon
            if (phone.StartsWith("224") && phone.Length >= 12)
            {
                return phone;
            }

            // Si commence par 622, 623, etc. (numeros locaux Guinee), ajouter 224
            if (phone.StartsWith("6") && phone.Length >= 8)
            {
                return "224" + phone;
            }

            // Si commence par 33 (France), c'est bon
            if (phone.StartsWith("33") && phone.Length >= 10)
            {
                return phone;
            }

            // Si commence par 0 (numero local France), remplacer 0 par 33
            if (phone.StartsWith("0") && phone.Length >= 10)
            {
                return "33" + phone.Substring(1);
            }

            // Par defaut, essayer d'ajouter 224 (Guinee)
            if (phone.Length >= 8)
            {
                return "224" + phone;
            }

            return null; // Numero invalide
        }

        // NORMALISATION NUMERO POUR TWILIO (avec +)
        private string NormalizePhoneForTwilio(string phone)
        {
            if (string.IsNullOrEmpty(phone)) return null;

            // Enlever tous les espaces et caracteres speciaux
            phone = phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Replace(".", "");

            // Si deja au format international (+)
            if (phone.StartsWith("+"))
            {
                return phone;
            }

            // Si commence par 00, remplacer par +
            if (phone.StartsWith("00"))
            {
                return "+" + phone.Substring(2);
            }

            // Si commence par 224 (Guinee), ajouter +
            if (phone.StartsWith("224") && phone.Length >= 12)
            {
                return "+" + phone;
            }

            // Si commence par 622, 623, etc. (numeros locaux Guinee), ajouter +224
            if (phone.StartsWith("6") && phone.Length >= 8)
            {
                return "+224" + phone;
            }

            // Si commence par 33 (France), ajouter +
            if (phone.StartsWith("33") && phone.Length >= 10)
            {
                return "+" + phone;
            }

            // Si commence par 0 (numero local France), remplacer 0 par +33
            if (phone.StartsWith("0") && phone.Length >= 10)
            {
                return "+33" + phone.Substring(1);
            }

            // Par defaut, essayer d'ajouter +224 (Guinee)
            if (phone.Length >= 8)
            {
                return "+224" + phone;
            }

            return null; // Numero invalide
        }

        // FORMATAGE SPÉCIAL MESSAGE POUR GREEN API
        private string FormatMessageForGreenAPI(string message)
        {
            if (string.IsNullOrEmpty(message)) return message;

            // 🔧 Green API supporte mieux les messages sans indentation excessive
            // Enlever les espaces de début de ligne multiples
            var lines = message.Split(new[] { '\r', '\n' }, StringSplitOptions.None);
            var cleanedLines = new List<string>();

            foreach (var line in lines)
            {
                // Garder une ligne vide, mais enlever l'indentation excessive
                if (string.IsNullOrWhiteSpace(line))
                {
                    cleanedLines.Add("");
                }
                else
                {
                    // Enlever les espaces de début en gardant le format
                    cleanedLines.Add(line.TrimStart());
                }
            }

            var cleanMessage = string.Join("\n", cleanedLines);

            // Enlever les lignes vides multiples successives
            while (cleanMessage.Contains("\n\n\n"))
            {
                cleanMessage = cleanMessage.Replace("\n\n\n", "\n\n");
            }

            return cleanMessage.Trim();
        }

        #endregion

    #endregion