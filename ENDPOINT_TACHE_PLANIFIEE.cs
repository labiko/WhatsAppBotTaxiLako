    /// <summary>
    /// 🔄 VÉRIFIER ET NOTIFIER LES PAIEMENTS CONFIRMÉS
    /// URL: /api/CheckPaymentNotifications
    /// Méthode: GET
    /// Fréquence recommandée: Chaque minute
    /// </summary>
    [HttpGet]
    [Route("api/CheckPaymentNotifications")]
    public async Task<ActionResult> CheckPaymentNotifications()
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        var startTime = DateTime.Now;
        var logMessages = new List<string>();

        // Configuration depuis Web.config
        var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
        var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];
        
        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
        {
            return Json(new
            {
                success = false,
                error = "Configuration Supabase manquante dans Web.config",
                timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            }, JsonRequestBehavior.AllowGet);
        }

        try
        {
            logMessages.Add($"🔄 [PAYMENT-CHECK] Début vérification paiements - {startTime:HH:mm:ss}");

            using (var httpClient = new HttpClient())
            {
                httpClient.DefaultRequestHeaders.Clear();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                httpClient.DefaultRequestHeaders.Add("Content-Type", "application/json");

                // URL du service payment-notification-checker
                string serviceUrl = $"{supabaseUrl}/functions/v1/payment-notification-checker";
                logMessages.Add($"📨 [PAYMENT-CHECK] Appel service: {serviceUrl}");

                // Appeler le service
                var content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
                var response = await httpClient.PostAsync(serviceUrl, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                logMessages.Add($"📊 [PAYMENT-CHECK] Status: {response.StatusCode}");
                logMessages.Add($"📊 [PAYMENT-CHECK] Response: {responseContent}");

                var duration = (DateTime.Now - startTime).TotalSeconds;

                if (response.IsSuccessStatusCode)
                {
                    var responseData = JsonConvert.DeserializeObject<dynamic>(responseContent);
                    
                    logMessages.Add($"✅ [PAYMENT-CHECK] Résultat: {responseData?.message}");
                    logMessages.Add($"📊 [PAYMENT-CHECK] Vérifiés={responseData?.checked}, Notifiés={responseData?.notified}, Échoués={responseData?.failed}");

                    return Json(new
                    {
                        success = true,
                        message = responseData?.message?.ToString() ?? "Vérification terminée",
                        checked = responseData?.checked ?? 0,
                        notified = responseData?.notified ?? 0,
                        failed = responseData?.failed ?? 0,
                        duration_seconds = duration,
                        logs = logMessages,
                        timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    }, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    logMessages.Add($"❌ [PAYMENT-CHECK] Erreur: HTTP {response.StatusCode}");
                    
                    return Json(new
                    {
                        success = false,
                        error = $"HTTP {response.StatusCode}",
                        details = responseContent,
                        logs = logMessages,
                        timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    }, JsonRequestBehavior.AllowGet);
                }
            }
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [PAYMENT-CHECK] Exception: {ex.Message}");

            return Json(new
            {
                success = false,
                error = ex.Message,
                logs = logMessages,
                timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            }, JsonRequestBehavior.AllowGet);
        }
    }

    public async Task<ActionResult> ProcessWhatsAppNotifications()
 {
     ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
     TaxiService taxiService = new TaxiService();
     int processedCount = 0;
     var startTime = DateTime.Now;
     var logMessages = new List<string>();

     // Configuration depuis Web.config
     var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
     var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];
     var twilioSid = ConfigurationManager.AppSettings["Twilio:Sid"];
     var twilioToken = ConfigurationManager.AppSettings["Twilio:Token"];
     var twilioNumber = ConfigurationManager.AppSettings["Twilio:Number"];

     try
     {
         logMessages.Add($"🚀 Démarrage traitement notifications - {startTime:HH:mm:ss}");

         using (var httpClient = new HttpClient())
         {
             // 🔧 HEADERS SUPABASE CORRECTS
             httpClient.DefaultRequestHeaders.Clear();
             httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
             httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
             httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");

             logMessages.Add("🔍 Test de connexion Supabase...");

             // TEST DE CONNEXION D'ABORD
             var testUrl = $"{supabaseUrl}/rest/v1/notifications_pending?select=count";
             var testResponse = await httpClient.GetStringAsync(testUrl);
             logMessages.Add($"✅ Connexion OK: {testResponse}");

             // 1. Récupérer notifications en attente
             var notifUrl = $"{supabaseUrl}/rest/v1/notifications_pending?processed_at=is.null&select=*";
             logMessages.Add($"📋 Récupération notifications: {notifUrl}");

             var notifResponse = await httpClient.GetStringAsync(notifUrl);
             logMessages.Add($"📋 Réponse: {notifResponse}");

             var notifications = JsonConvert.DeserializeObject<dynamic[]>(notifResponse);
             logMessages.Add($"📊 {notifications.Length} notification(s) trouvée(s)");

             if (notifications.Length == 0)
             {
                 logMessages.Add("✅ Aucune notification à traiter");
                 return Json(new
                 {
                     success = true,
                     processed = 0,
                     message = "Aucune notification en attente",
                     logs = logMessages,
                     duration = (DateTime.Now - startTime).TotalSeconds
                 }, JsonRequestBehavior.AllowGet);
             }

             foreach (var notif in notifications)
             {
                 try
                 {
                     logMessages.Add($"📤 Traitement notification: {notif.id} -> réservation: {notif.reservation_id}");
                     logMessages.Add($"🔍 Type: {notif.type?.ToString() ?? "null"}, Created: {notif.created_at?.ToString() ?? "null"}");

                     // Vérifier le type de notification
                     string notificationType = notif.type?.ToString() ?? "reservation_accepted";
                     logMessages.Add($"🔍 Type de notification: {notificationType}");

                     switch (notificationType)
                     {
                         case "auto_cancellation":
                             // Gérer l'annulation automatique
                             logMessages.Add($"❌ Traitement annulation automatique pour {notif.reservation_id}");

                             var cancelSuccess = await SendCancellationMessageAsync(notif.reservation_id.ToString(), httpClient, supabaseUrl, supabaseKey, twilioSid, twilioToken, twilioNumber, logMessages);

                             if (cancelSuccess)
                             {
                                 var markSuccess = await MarkNotificationAsProcessedAsync(notif.id.ToString(), httpClient, supabaseUrl, supabaseKey, logMessages);
                                 logMessages.Add($"✅ Message d'annulation envoyé et marqué comme traité: {markSuccess}");
                                 if (markSuccess) processedCount++;
                             }
                             else
                             {
                                 logMessages.Add($"❌ Échec envoi message d'annulation");
                                 continue;
                             }
                             break;

                         case "course_validated":
                             // Demande de notation après validation de course
                             logMessages.Add($"⭐ Demande de notation pour {notif.reservation_id}");

                             var ratingSuccess = await SendRatingRequestMessageAsync(notif.reservation_id.ToString(), httpClient, supabaseUrl, supabaseKey, twilioSid, twilioToken, twilioNumber, logMessages);

                             if (ratingSuccess)
                             {
                                 // Préparer la session pour la notation via Edge Function
                                 var prepareSuccess = await PrepareRatingSessionAsync(notif.reservation_id.ToString(), httpClient, supabaseUrl, supabaseKey, logMessages);
                                 logMessages.Add($"🎯 Préparation session notation: {prepareSuccess}");

                                 var markSuccess = await MarkNotificationAsProcessedAsync(notif.id.ToString(), httpClient, supabaseUrl, supabaseKey, logMessages);
                                 logMessages.Add($"✅ Message de notation envoyé et marqué comme traité: {markSuccess}");
                                 if (markSuccess) processedCount++;
                             }
                             else
                             {
                                 logMessages.Add($"❌ Échec envoi message de notation");
                                 continue;
                             }
                             break;

                         case "thanks_client":
                             // Message de remerciement après notation
                             logMessages.Add($"🙏 Message de remerciement pour {notif.reservation_id}");

                             var thanksSuccess = await taxiService.SendThanksMessageAsync(notif.reservation_id.ToString(), httpClient, supabaseUrl, supabaseKey, twilioSid, twilioToken, twilioNumber, logMessages);

                             if (thanksSuccess)
                             {
                                 var markSuccess = await MarkNotificationAsProcessedAsync(notif.id.ToString(), httpClient, supabaseUrl, supabaseKey, logMessages);
                                 logMessages.Add($"✅ Message de remerciement envoyé et marqué comme traité: {markSuccess}");
                                 if (markSuccess) processedCount++;
                             }
                             else
                             {
                                 logMessages.Add($"❌ Échec envoi message de remerciement");
                                 continue;
                             }
                             break;

                         case "reservation_accepted":
                         default:
                             // Traitement normal - conducteur assigné
                             logMessages.Add($"🚖 Traitement assignation conducteur pour {notif.reservation_id}");

                             // 2. Récupérer réservation avec conducteur et coordonnées extraites
                             var resUrl = $"{supabaseUrl}/rest/v1/rpc/get_reservation_with_coords";
                             var resRequest = new HttpRequestMessage(HttpMethod.Post, resUrl);
                             resRequest.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                             resRequest.Headers.Add("apikey", supabaseKey);
                             resRequest.Content = new StringContent(
                                 JsonConvert.SerializeObject(new { p_reservation_id = notif.reservation_id }),
                                 System.Text.Encoding.UTF8,
                                 "application/json"
                             );
                             var resResponse = await httpClient.SendAsync(resRequest);
                             var resContent = await resResponse.Content.ReadAsStringAsync();

                             logMessages.Add($"🔍 DEBUG Response: {resContent.Substring(0, Math.Min(200, resContent.Length))}");

                             // La fonction RPC peut retourner un objet ou un tableau
                             dynamic reservations = null;
                             dynamic res = null;

                             if (resContent.StartsWith("["))
                             {
                                 // C'est un tableau
                                 reservations = JsonConvert.DeserializeObject<dynamic[]>(resContent);
                                 if (reservations.Length > 0)
                                 {
                                     res = reservations[0];
                                 }
                             }
                             else if (resContent.StartsWith("{"))
                             {
                                 // C'est un objet direct (probablement une erreur)
                                 var errorObj = JsonConvert.DeserializeObject<dynamic>(resContent);
                                 if (errorObj.code != null)
                                 {
                                     logMessages.Add($"❌ Erreur fonction SQL: {errorObj.message ?? errorObj.code}");
                                     // Fallback : utiliser la requête directe
                                     var fallbackUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{notif.reservation_id}&select=*,conducteurs(*)";
                                     var fallbackResponse = await httpClient.GetStringAsync(fallbackUrl);
                                     reservations = JsonConvert.DeserializeObject<dynamic[]>(fallbackResponse);
                                     if (reservations.Length > 0)
                                     {
                                         res = reservations[0];
                                     }
                                 }
                             }

                             if (res != null)
                             {

                                 // Détecter si on a les champs de la fonction SQL ou les champs standards
                                 bool hasExtractedCoords = res.client_lat != null;

                                 string conducteurPrenom = hasExtractedCoords ? res.conducteur_prenom?.ToString() : res.conducteurs?.prenom?.ToString();
                                 string conducteurNom = hasExtractedCoords ? res.conducteur_nom?.ToString() : res.conducteurs?.nom?.ToString();

                                 logMessages.Add($"🚖 Conducteur: {conducteurPrenom} {conducteurNom} pour client: {res.client_phone}");

                                 // 3. Extraire les coordonnées (soit depuis la fonction SQL, soit depuis les champs PostGIS)
                                 double clientLat, clientLon, conducteurLat, conducteurLon;

                                 if (hasExtractedCoords)
                                 {
                                     // Utiliser les coordonnées extraites par la fonction SQL
                                     clientLat = (double)(res.client_lat ?? 0.0);
                                     clientLon = (double)(res.client_lon ?? 0.0);
                                     conducteurLat = (double)(res.conducteur_lat ?? 0.0);
                                     conducteurLon = (double)(res.conducteur_lon ?? 0.0);
                                 }
                                 else
                                 {
                                     // Fallback : essayer d'extraire depuis les champs PostGIS
                                     clientLat = taxiService.ExtractLatitudeFromGeography(res.position_depart);
                                     clientLon = taxiService.ExtractLongitudeFromGeography(res.position_depart);
                                     conducteurLat = taxiService.ExtractLatitudeFromGeography(res.conducteurs?.position_actuelle);
                                     conducteurLon = taxiService.ExtractLongitudeFromGeography(res.conducteurs?.position_actuelle);
                                 }

                                 logMessages.Add($"📍 Coordonnées Client: Lat={clientLat}, Lon={clientLon}");
                                 logMessages.Add($"📍 Coordonnées Conducteur: Lat={conducteurLat}, Lon={conducteurLon}");

                                 // 4. Calculer distance réelle client-conducteur
                                 var distanceKm = (decimal)taxiService.CalculateDistance(clientLat, clientLon, conducteurLat, conducteurLon);
                                 // Coefficients différents moto/voiture pour approximer la distance routière
                                 decimal coefficient = res.vehicle_type?.ToString() == "moto" ? 1.3m : 1.4m;
                                 var distanceRouteKm = distanceKm * coefficient;
                                 var etaMinutes = Math.Max(5, (int)Math.Round(distanceRouteKm * 3)); // 3 min par km minimum 5 min

                                 // 4. Message WhatsApp amélioré avec formatage intelligent
                                 var vehicleEmoji = res.vehicle_type?.ToString() == "moto" ? "🏍️" : "🚗";

                                 // Adapter selon le format de données disponible
                                 decimal noteMoyenne = hasExtractedCoords ?
                                     (decimal?)(res.conducteur_note_moyenne) ?? 4.5m :
                                     (decimal?)(res.conducteurs?.note_moyenne) ?? 4.5m;

                                 string telephone = hasExtractedCoords ?
                                     res.conducteur_telephone?.ToString() :
                                     res.conducteurs?.telephone?.ToString();

                                 string vehicleMarque = hasExtractedCoords ?
                                     res.conducteur_vehicle_marque?.ToString() :
                                     res.conducteurs?.vehicle_marque?.ToString();

                                 string vehicleModele = hasExtractedCoords ?
                                     res.conducteur_vehicle_modele?.ToString() :
                                     res.conducteurs?.vehicle_modele?.ToString();

                                 string vehiclePlaque = hasExtractedCoords ?
                                     res.conducteur_vehicle_plaque?.ToString() :
                                     res.conducteurs?.vehicle_plaque?.ToString();

                                 var starsDisplay = taxiService.GenerateStarsFromRating(noteMoyenne);
                                 var formattedPhone = taxiService.FormatPhoneDisplay(telephone);
                                 var vehicleDescription = $"{vehicleMarque} {vehicleModele}";
                                 var formattedPrice = taxiService.FormatPrice(res.prix_total);

                                 var message = $"🎯 *TAXI CONFIRMÉ*\n\n" +
                                             $"{vehicleEmoji} *{conducteurPrenom} * {starsDisplay}\n" +
                                             $"📞 {formattedPhone}\n" +
                                             $"🚗 {vehicleDescription}\n" +
                                             $"🏷️ {vehiclePlaque}\n" +
                                             $"🔑 Code: *{res.code_validation}*\n" +
                                             $"📏 Distance: *{distanceRouteKm:F1} km*\n" +
                                             $"⏱️ Arrive dans *{etaMinutes} min*\n\n" +
                                             $"💰 *{formattedPrice} GNF*\n\n" +
                                             $"🚀 Votre conducteur arrive !\n" +
                                             $"📱 Il vous contactera bientôt";

                                 // 🔧 5. Log du message pour debug
                                 logMessages.Add($"📱 Message à envoyer: {message.Replace("\n", " ")}");
                                 logMessages.Add($"📏 Distance vol d'oiseau: {distanceKm:F1} km → Distance route: {distanceRouteKm:F1} km (×{coefficient})");

                                 // 🔧 6. Envoyer WhatsApp via service multi-provider
                                 bool whatsappSuccess = await taxiService.SendWhatsAppMessage(res.client_phone.ToString(), message, logMessages);

                                 if (!whatsappSuccess)
                                 {
                                     continue;
                                 }

                                 var markSuccess = await MarkNotificationAsProcessedAsync(notif.id.ToString(), httpClient, supabaseUrl, supabaseKey, logMessages);
                                 logMessages.Add($"📝 Notification marquée comme traitée: {markSuccess}");

                                 processedCount++;
                             }
                             else
                             {
                                 logMessages.Add($"❌ Aucune réservation trouvée pour ID: {notif.reservation_id}");
                             }
                             break;
                     }

                     // Petit délai pour éviter le spam
                     await Task.Delay(1000);
                 }
                 catch (Exception ex)
                 {
                     logMessages.Add($"❌ Erreur notification {notif.id}: {ex.Message}");
                 }
             }
         }

         var duration = (DateTime.Now - startTime).TotalSeconds;
         var resultMessage = $"✅ Traitement terminé: {processedCount} notification(s) traitée(s) en {duration:F1}s";
         logMessages.Add(resultMessage);

         return Json(new
         {
             success = true,
             processed = processedCount,
             message = resultMessage,
             logs = logMessages,
             duration = duration
         }, JsonRequestBehavior.AllowGet);
     }
     catch (Exception ex)
     {
         var duration = (DateTime.Now - startTime).TotalSeconds;
         logMessages.Add($"❌ ERREUR GLOBALE: {ex.Message}");

         return Json(new
         {
             success = false,
             processed = 0,
             message = $"Erreur: {ex.Message}",
             logs = logMessages,
             duration = duration,
             stackTrace = ex.ToString()
         }, JsonRequestBehavior.AllowGet);
     }
 }
        private async Task<bool> SendCancellationMessageAsync(string reservationId, HttpClient httpClient, string supabaseUrl, string supabaseKey, string twilioSid, string twilioToken, string twilioNumber, List<string> logMessages)
        {
            try
            {
                logMessages.Add($"🔍 SendCancellation pour réservation: {reservationId}");

                // Message d'annulation en français
                                    var message =
                                    @"❌ *RÉSERVATION ANNULÉE AUTOMATIQUEMENT*

                    Aucun conducteur disponible n'a accepté votre demande dans les 30 minutes.

                    🔄 Pour effectuer une nouvelle réservation, écrivez 'taxi'.

                    Nous vous présentons nos excuses pour la gêne occasionnée.";

                // Récupérer le client_phone depuis la réservation
                var resUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}&select=client_phone,vehicle_type";
                logMessages.Add($"🔍 URL réservation: {resUrl}");

                var resResponse = await httpClient.GetStringAsync(resUrl);
                logMessages.Add($"🔍 Réponse réservation: {resResponse}");

                var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                if (reservations?.Length > 0)
                {
                    var clientPhone = reservations[0].client_phone?.ToString();
                    var vehicleType = reservations[0].vehicle_type?.ToString() ?? "taxi";

                    logMessages.Add($"🔍 Client trouvé: {clientPhone}, Type: {vehicleType}");

                    if (string.IsNullOrEmpty(clientPhone))
                    {
                        logMessages.Add($"❌ Client phone vide pour réservation {reservationId}");
                        return false;
                    }

                    // Vérifier si c'est un numéro de test
                    if (clientPhone.StartsWith("TEST_"))
                    {
                        logMessages.Add($"🧪 Numéro de test détecté: {clientPhone} - Marquage direct comme traité");
                        return true; // Marquer comme succès pour les tests
                    }

                    // Normaliser le numéro de téléphone pour Twilio
                    string normalizedPhone = NormalizePhoneNumber(clientPhone);
                    logMessages.Add($"🔍 Numéro normalisé: {clientPhone} → {normalizedPhone}");

                    if (string.IsNullOrEmpty(normalizedPhone))
                    {
                        logMessages.Add($"❌ Impossible de normaliser le numéro: {clientPhone}");
                        return false;
                    }

                    // Personnaliser le message selon le type de véhicule
                    if (vehicleType == "moto")
                    {
                        message = message.Replace("conducteur", "motard");
                    }

                    // 🔧 Envoyer WhatsApp via provider configuré (Twilio ou Green API)
                    var whatsappProvider = ConfigurationManager.AppSettings["WhatsApp:Provider"] ?? "twilio";
                    bool whatsappSuccess = false;
                    
                    if (whatsappProvider == "greenapi")
                    {
                        // 🟢 ENVOYER VIA GREEN API
                        var greenApiInstanceId = ConfigurationManager.AppSettings["GreenAPI:InstanceId"];
                        var greenApiToken = ConfigurationManager.AppSettings["GreenAPI:Token"];
                        var greenApiBaseUrl = ConfigurationManager.AppSettings["GreenAPI:BaseUrl"] ?? "https://api.green-api.com";
                        
                        using (var greenApiClient = new HttpClient())
                        {
                            var phoneForGreenApi = normalizedPhone.Replace("+", "");
                            if (!phoneForGreenApi.StartsWith("224") && phoneForGreenApi.StartsWith("6"))
                            {
                                phoneForGreenApi = "224" + phoneForGreenApi;
                            }
                            
                            var greenApiUrl = $"{greenApiBaseUrl}/waInstance{greenApiInstanceId}/sendMessage/{greenApiToken}";
                            var payload = new { chatId = $"{phoneForGreenApi}@c.us", message = message };
                            var jsonPayload = JsonConvert.SerializeObject(payload);
                            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                            
                            logMessages.Add($"🟢 Envoi Green API vers: {phoneForGreenApi}");
                            
                            var greenApiResponse = await greenApiClient.PostAsync(greenApiUrl, content);
                            whatsappSuccess = greenApiResponse.IsSuccessStatusCode;
                            
                            logMessages.Add($"🔍 Réponse Green API: {greenApiResponse.StatusCode}");
                            
                            if (!whatsappSuccess)
                            {
                                var errorContent = await greenApiResponse.Content.ReadAsStringAsync();
                                logMessages.Add($"❌ Erreur Green API: {errorContent}");
                            }
                        }
                    }
                    else
                    {
                        // 🔵 ENVOYER VIA TWILIO (comportement original)
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

                            logMessages.Add($"🔵 Envoi Twilio vers: {normalizedPhone}");

                            var twilioResponse = await twilioClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json", formData);
                            whatsappSuccess = twilioResponse.IsSuccessStatusCode;
                            
                            logMessages.Add($"🔍 Réponse Twilio: {twilioResponse.StatusCode}");

                            if (!whatsappSuccess)
                            {
                                var errorContent = await twilioResponse.Content.ReadAsStringAsync();
                                logMessages.Add($"❌ Erreur Twilio: {errorContent}");
                            }
                        }
                    }
                    
                    return whatsappSuccess;
                }
                else
                {
                    logMessages.Add($"❌ Aucune réservation trouvée pour ID: {reservationId}");
                }

                return false;
            }
            catch (Exception ex)
            {
                logMessages.Add($"❌ Exception SendCancellation: {ex.Message}");
                return false;
            }
        }

        //  - AutoCancelExpired → 5 minutes
        public async Task<ActionResult> AutoCancelExpired()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            var startTime = DateTime.Now;
            var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
            var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];

            try
            {
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Clear();
                    httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    // Appeler la fonction SQL d'annulation automatique
                    var cancelUrl = $"{supabaseUrl}/rest/v1/rpc/auto_cancel_expired_reservations";
                    var response = await httpClient.PostAsync(cancelUrl, new StringContent("{}", Encoding.UTF8, "application/json"));

                    if (response.IsSuccessStatusCode)
                    {
                        var result = await response.Content.ReadAsStringAsync();
                        var duration = (DateTime.Now - startTime).TotalSeconds;

                        return Json(new
                        {
                            success = true,
                            message = "✅ Nettoyage automatique effectué",
                            result = JsonConvert.DeserializeObject(result),
                            duration = duration,
                            timestamp = DateTime.Now
                        }, JsonRequestBehavior.AllowGet);
                    }
                    else
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        return Json(new
                        {
                            success = false,
                            message = "❌ Erreur lors du nettoyage",
                            error = error,
                            statusCode = response.StatusCode
                        }, JsonRequestBehavior.AllowGet);
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = $"❌ Exception: {ex.Message}",
                    stackTrace = ex.ToString()
                }, JsonRequestBehavior.AllowGet);
            }
        }

        private async Task<bool> MarkNotificationAsProcessedAsync(string notificationId, HttpClient httpClient, string supabaseUrl, string supabaseKey, List<string> logMessages)
        {
            try
            {
                var updateData = JsonConvert.SerializeObject(new { processed_at = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") });
                logMessages.Add($"🔧 Marquage notification {notificationId} - Data: {updateData}");

                var patchRequest = new HttpRequestMessage(new HttpMethod("PATCH"), $"{supabaseUrl}/rest/v1/notifications_pending?id=eq.{notificationId}");
                patchRequest.Headers.Add("apikey", supabaseKey);
                patchRequest.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                patchRequest.Headers.Add("Prefer", "return=minimal");
                patchRequest.Content = new StringContent(updateData, Encoding.UTF8, "application/json");

                logMessages.Add($"🔧 URL PATCH: {patchRequest.RequestUri}");

                var response = await httpClient.SendAsync(patchRequest);
                logMessages.Add($"🔧 Réponse PATCH: {response.StatusCode}");

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    logMessages.Add($"❌ Erreur PATCH: {errorContent}");
                    return false;
                }

                logMessages.Add($"✅ Notification {notificationId} marquée avec succès");
                return true;
            }
            catch (Exception ex)
            {
                logMessages.Add($"❌ Exception MarkNotification: {ex.Message}");
                return false;
            }
        }

        private async Task<bool> SendRatingRequestMessageAsync(string reservationId, HttpClient httpClient, string supabaseUrl, string supabaseKey, string twilioSid, string twilioToken, string twilioNumber, List<string> logMessages)
        {
            try
            {
                logMessages.Add($"🔍 SendRatingRequest pour réservation: {reservationId}");

                // Message de demande de notation avec système lettres A-E
                var message = @"🌟 *VOTRE COURSE EST TERMINÉE*

Comment évaluez-vous votre conducteur ?

⭐ Tapez une lettre :
• A = ⭐ (Très mauvais)
• B = ⭐⭐ (Mauvais)  
• C = ⭐⭐⭐ (Moyen)
• D = ⭐⭐⭐⭐ (Bon)
• E = ⭐⭐⭐⭐⭐ (Excellent)

Votre avis nous aide à améliorer notre service ! 🙏";

                // Récupérer le client_phone depuis la réservation
                var resUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}&select=client_phone,conducteurs(prenom,nom)";
                logMessages.Add($"🔍 URL réservation: {resUrl}");

                var resResponse = await httpClient.GetStringAsync(resUrl);
                logMessages.Add($"🔍 Réponse réservation: {resResponse}");

                var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                if (reservations?.Length > 0)
                {
                    var clientPhone = reservations[0].client_phone?.ToString();
                    var conducteur = reservations[0].conducteurs;
                    var conducteurNom = $"{conducteur?.prenom} {conducteur?.nom}";

                    logMessages.Add($"🔍 Client trouvé: {clientPhone}, Conducteur: {conducteurNom}");

                    if (string.IsNullOrEmpty(clientPhone))
                    {
                        logMessages.Add($"❌ Client phone vide pour réservation {reservationId}");
                        return false;
                    }

                    // Vérifier si c'est un numéro de test
                    if (clientPhone.StartsWith("TEST_"))
                    {
                        logMessages.Add($"🧪 Numéro de test détecté: {clientPhone} - Marquage direct comme traité");
                        return true; // Marquer comme succès pour les tests
                    }

                    // Normaliser le numéro de téléphone pour Twilio
                    string normalizedPhone = NormalizePhoneNumber(clientPhone);
                    logMessages.Add($"🔍 Numéro normalisé: {clientPhone} → {normalizedPhone}");

                    if (string.IsNullOrEmpty(normalizedPhone))
                    {
                        logMessages.Add($"❌ Impossible de normaliser le numéro: {clientPhone}");
                        return false;
                    }

                    // 🔧 Envoyer WhatsApp via provider configuré (Twilio ou Green API)
                    var whatsappProvider = ConfigurationManager.AppSettings["WhatsApp:Provider"] ?? "twilio";
                    bool whatsappSuccess = false;
                    
                    if (whatsappProvider == "greenapi")
                    {
                        // 🟢 ENVOYER VIA GREEN API
                        var greenApiInstanceId = ConfigurationManager.AppSettings["GreenAPI:InstanceId"];
                        var greenApiToken = ConfigurationManager.AppSettings["GreenAPI:Token"];
                        var greenApiBaseUrl = ConfigurationManager.AppSettings["GreenAPI:BaseUrl"] ?? "https://api.green-api.com";
                        
                        using (var greenApiClient = new HttpClient())
                        {
                            var phoneForGreenApi = normalizedPhone.Replace("+", "");
                            if (!phoneForGreenApi.StartsWith("224") && phoneForGreenApi.StartsWith("6"))
                            {
                                phoneForGreenApi = "224" + phoneForGreenApi;
                            }
                            
                            var greenApiUrl = $"{greenApiBaseUrl}/waInstance{greenApiInstanceId}/sendMessage/{greenApiToken}";
                            var payload = new { chatId = $"{phoneForGreenApi}@c.us", message = message };
                            var jsonPayload = JsonConvert.SerializeObject(payload);
                            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                            
                            logMessages.Add($"🟢 Envoi Green API demande notation vers: {phoneForGreenApi}");
                            
                            var greenApiResponse = await greenApiClient.PostAsync(greenApiUrl, content);
                            whatsappSuccess = greenApiResponse.IsSuccessStatusCode;
                            
                            logMessages.Add($"🔍 Réponse Green API: {greenApiResponse.StatusCode}");
                            
                            if (!whatsappSuccess)
                            {
                                var errorContent = await greenApiResponse.Content.ReadAsStringAsync();
                                logMessages.Add($"❌ Erreur Green API: {errorContent}");
                            }
                        }
                    }
                    else
                    {
                        // 🔵 ENVOYER VIA TWILIO (comportement original)
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

                            logMessages.Add($"🔵 Envoi Twilio demande notation vers: {normalizedPhone}");

                            var twilioResponse = await twilioClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json", formData);
                            whatsappSuccess = twilioResponse.IsSuccessStatusCode;
                            
                            logMessages.Add($"🔍 Réponse Twilio: {twilioResponse.StatusCode}");

                            if (!whatsappSuccess)
                            {
                                var errorContent = await twilioResponse.Content.ReadAsStringAsync();
                                logMessages.Add($"❌ Erreur Twilio: {errorContent}");
                            }
                        }
                    }
                    
                    return whatsappSuccess;
                }
                else
                {
                    logMessages.Add($"❌ Aucune réservation trouvée pour ID: {reservationId}");
                }

                return false;
            }
            catch (Exception ex)
            {
                logMessages.Add($"❌ Exception SendRatingRequest: {ex.Message}");
                return false;
            }
        }

        private async Task<bool> PrepareRatingSessionAsync(string reservationId, HttpClient httpClient, string supabaseUrl, string supabaseKey, List<string> logMessages)
        {
            try
            {
                logMessages.Add($"🔍 PrepareRatingSession pour réservation: {reservationId}");

                // Récupérer le client_phone depuis la réservation
                var resUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}&select=client_phone";
                var resResponse = await httpClient.GetStringAsync(resUrl);
                var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                if (reservations?.Length > 0)
                {
                    var clientPhone = reservations[0].client_phone?.ToString();
                    logMessages.Add($"🔍 Client trouvé: {clientPhone}");

                    if (string.IsNullOrEmpty(clientPhone))
                    {
                        logMessages.Add($"❌ Client phone vide pour réservation {reservationId}");
                        return false;
                    }

                    // Appeler l'Edge Function whatsapp-bot avec l'action prepareRating
                    var edgeFunctionUrl = $"{supabaseUrl}/functions/v1/whatsapp-bot?action=prepareRating";
                    
                    var payload = JsonConvert.SerializeObject(new
                    {
                        clientPhone = clientPhone,
                        reservationId = reservationId
                    });

                    logMessages.Add($"🔍 Appel Edge Function: {edgeFunctionUrl}");
                    logMessages.Add($"🔍 Payload: {payload}");

                    var request = new HttpRequestMessage(HttpMethod.Post, edgeFunctionUrl);
                    request.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

                    var response = await httpClient.SendAsync(request);
                    var responseContent = await response.Content.ReadAsStringAsync();

                    logMessages.Add($"🔍 Réponse Edge Function: {response.StatusCode}");
                    logMessages.Add($"🔍 Contenu réponse: {responseContent}");

                    return response.IsSuccessStatusCode;
                }
                else
                {
                    logMessages.Add($"❌ Aucune réservation trouvée pour ID: {reservationId}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                logMessages.Add($"❌ Exception PrepareRatingSession: {ex.Message}");
                return false;
            }
        }

        private async Task<bool> SendThanksMessageAsync(string reservationId, HttpClient httpClient, string supabaseUrl, string supabaseKey, string twilioSid, string twilioToken, string twilioNumber, List<string> logMessages)
        {
            try
            {
                logMessages.Add($"🔍 SendThanksMessage pour réservation: {reservationId}");

                // Message de remerciement personnalisé
                var message = @"🙏 *MERCI POUR VOTRE ÉVALUATION !*

Votre avis nous aide à améliorer notre service.

💾 *Sauvegarder ce point de départ ?*
Tapez un nom pour l'enregistrer :

🏠 mon domicile
🏢 mon bureau  
📍 [ou n'importe quel nom]

✨ Cette adresse sera proposée dans vos futures réservations !

_Tapez 'taxi' pour une nouvelle course_";

                // Récupérer le client_phone depuis la réservation
                var resUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}&select=client_phone,note_conducteur";
                logMessages.Add($"🔍 URL réservation: {resUrl}");

                var resResponse = await httpClient.GetStringAsync(resUrl);
                logMessages.Add($"🔍 Réponse réservation: {resResponse}");

                var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                if (reservations?.Length > 0)
                {
                    var clientPhone = reservations[0].client_phone?.ToString();
                    var noteValue = reservations[0].note_conducteur;

                    logMessages.Add($"🔍 Client trouvé: {clientPhone}, Note donnée: {noteValue}");

                    if (string.IsNullOrEmpty(clientPhone))
                    {
                        logMessages.Add($"❌ Client phone vide pour réservation {reservationId}");
                        return false;
                    }

                    // Vérifier si c'est un numéro de test
                    if (clientPhone.StartsWith("TEST_"))
                    {
                        logMessages.Add($"🧪 Numéro de test détecté: {clientPhone} - Marquage direct comme traité");
                        return true; // Marquer comme succès pour les tests
                    }

                    // Normaliser le numéro de téléphone pour Twilio
                    string normalizedPhone = NormalizePhoneNumber(clientPhone);
                    logMessages.Add($"🔍 Numéro normalisé: {clientPhone} → {normalizedPhone}");

                    if (string.IsNullOrEmpty(normalizedPhone))
                    {
                        logMessages.Add($"❌ Impossible de normaliser le numéro: {clientPhone}");
                        return false;
                    }

                    // 🔧 Envoyer WhatsApp via provider configuré (Twilio ou Green API)
                    var whatsappProvider = ConfigurationManager.AppSettings["WhatsApp:Provider"] ?? "twilio";
                    bool whatsappSuccess = false;
                    
                    if (whatsappProvider == "greenapi")
                    {
                        // 🟢 ENVOYER VIA GREEN API
                        var greenApiInstanceId = ConfigurationManager.AppSettings["GreenAPI:InstanceId"];
                        var greenApiToken = ConfigurationManager.AppSettings["GreenAPI:Token"];
                        var greenApiBaseUrl = ConfigurationManager.AppSettings["GreenAPI:BaseUrl"] ?? "https://api.green-api.com";
                        
                        using (var greenApiClient = new HttpClient())
                        {
                            var phoneForGreenApi = normalizedPhone.Replace("+", "");
                            if (!phoneForGreenApi.StartsWith("224") && phoneForGreenApi.StartsWith("6"))
                            {
                                phoneForGreenApi = "224" + phoneForGreenApi;
                            }
                            
                            var greenApiUrl = $"{greenApiBaseUrl}/waInstance{greenApiInstanceId}/sendMessage/{greenApiToken}";
                            var payload = new { chatId = $"{phoneForGreenApi}@c.us", message = message };
                            var jsonPayload = JsonConvert.SerializeObject(payload);
                            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                            
                            logMessages.Add($"🟢 Envoi Green API remerciement vers: {phoneForGreenApi}");
                            
                            var greenApiResponse = await greenApiClient.PostAsync(greenApiUrl, content);
                            whatsappSuccess = greenApiResponse.IsSuccessStatusCode;
                            
                            logMessages.Add($"🔍 Réponse Green API: {greenApiResponse.StatusCode}");
                            
                            if (!whatsappSuccess)
                            {
                                var errorContent = await greenApiResponse.Content.ReadAsStringAsync();
                                logMessages.Add($"❌ Erreur Green API: {errorContent}");
                            }
                        }
                    }
                    else
                    {
                        // 🔵 ENVOYER VIA TWILIO (comportement original)
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

                            logMessages.Add($"🔵 Envoi Twilio remerciement vers: {normalizedPhone}");

                            var twilioResponse = await twilioClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json", formData);
                            whatsappSuccess = twilioResponse.IsSuccessStatusCode;
                            
                            logMessages.Add($"🔍 Réponse Twilio: {twilioResponse.StatusCode}");

                            if (!whatsappSuccess)
                            {
                                var errorContent = await twilioResponse.Content.ReadAsStringAsync();
                                logMessages.Add($"❌ Erreur Twilio: {errorContent}");
                            }
                        }
                    }
                    
                    return whatsappSuccess;
                }
                else
                {
                    logMessages.Add($"❌ Aucune réservation trouvée pour ID: {reservationId}");
                }

                return false;
            }
            catch (Exception ex)
            {
                logMessages.Add($"❌ Exception SendThanksMessage: {ex.Message}");
                return false;
            }
        }

        private string NormalizePhoneNumber(string phone)
        {
            if (string.IsNullOrEmpty(phone)) return null;

            // Enlever tous les espaces et caractères spéciaux
            phone = phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Replace(".", "");

            // Si déjà au format international (+)
            if (phone.StartsWith("+"))
            {
                return phone;
            }

            // Si commence par 00, remplacer par +
            if (phone.StartsWith("00"))
            {
                return "+" + phone.Substring(2);
            }

            // Si commence par 224 (Guinée), ajouter +
            if (phone.StartsWith("224") && phone.Length >= 12)
            {
                return "+" + phone;
            }

            // Si commence par 622, 623, etc. (numéros locaux Guinée), ajouter +224
            if (phone.StartsWith("6") && phone.Length >= 8)
            {
                return "+224" + phone;
            }

            // Si commence par 33 (France), ajouter +
            if (phone.StartsWith("33") && phone.Length >= 10)
            {
                return "+" + phone;
            }

            // Si commence par 0 (numéro local France), remplacer 0 par +33
            if (phone.StartsWith("0") && phone.Length >= 10)
            {
                return "+33" + phone.Substring(1);
            }

            // Par défaut, essayer d'ajouter +224 (Guinée)
            if (phone.Length >= 8)
            {
                return "+224" + phone;
            }

            return null; // Numéro invalide
        }

        // ========================================
        // 🎨 FONCTIONS HELPER FORMATAGE MESSAGE
        // ========================================

        /// <summary>
        /// Génère affichage étoiles basé sur note réelle
        /// </summary>
        private string GenerateStarsFromRating(decimal rating)
        {
            int fullStars = (int)Math.Floor(rating);
            bool hasHalfStar = (rating - fullStars) >= 0.5m;
            
            string stars = "";
            for (int i = 0; i < fullStars && i < 5; i++)
            {
                stars += "★";
            }
            if (hasHalfStar && fullStars < 5)
            {
                stars += "⭐";
            }
            
            return $"{stars} ({rating:F1})";
        }

        /// <summary>
        /// Formate numéro téléphone avec espaces
        /// </summary>
        private string FormatPhoneDisplay(string phone)
        {
            if (string.IsNullOrEmpty(phone)) return "N/A";
            
            // Nettoyer le numéro
            phone = phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
            
            // Format Guinée : +224 XX XX XX XXX
            if (phone.StartsWith("224") && phone.Length >= 12)
            {
                return $"+224 {phone.Substring(3, 2)} {phone.Substring(5, 2)} {phone.Substring(7, 2)} {phone.Substring(9)}";
            }
            
            // Format France : +33 X XX XX XX XX
            if (phone.StartsWith("33") && phone.Length >= 10)
            {
                return $"+33 {phone.Substring(2, 1)} {phone.Substring(3, 2)} {phone.Substring(5, 2)} {phone.Substring(7, 2)} {phone.Substring(9, 2)}";
            }
            
            // Si commence par +, garder tel quel mais ajouter espaces
            if (phone.StartsWith("+"))
            {
                return phone;
            }
            
            // Par défaut, ajouter +224 et formater
            if (phone.Length >= 9)
            {
                return $"+224 {phone.Substring(0, 2)} {phone.Substring(2, 2)} {phone.Substring(4, 2)} {phone.Substring(6)}";
            }
            
            return phone;
        }

        /// <summary>
        /// Construit description véhicule avec données existantes
        /// </summary>
        private string BuildVehicleDescription(dynamic cond)
        {
            var parts = new List<string>();
            
            if (cond.vehicle_couleur != null && !string.IsNullOrEmpty(cond.vehicle_couleur.ToString()))
            {
                string couleur = cond.vehicle_couleur.ToString();
                if (couleur != "null")
                    parts.Add(couleur);
            }
            
            if (cond.vehicle_marque != null && !string.IsNullOrEmpty(cond.vehicle_marque.ToString()))
            {
                string marque = cond.vehicle_marque.ToString();
                if (marque != "null")
                    parts.Add(marque);
            }
            
            if (cond.vehicle_modele != null && !string.IsNullOrEmpty(cond.vehicle_modele.ToString()))
            {
                string modele = cond.vehicle_modele.ToString();
                if (modele != "null")
                    parts.Add(modele);
            }
            
            return parts.Count > 0 ? string.Join(" ", parts) : "Véhicule";
        }

        /// <summary>
        /// Formate prix avec espaces pour lisibilité
        /// </summary>
        private string FormatPrice(dynamic price)
        {
            if (price == null) return "0";
            
            decimal priceDecimal;
            if (decimal.TryParse(price.ToString(), out priceDecimal))
            {
                return priceDecimal.ToString("N0", new System.Globalization.CultureInfo("fr-FR"));
            }
            
            return price.ToString();
        }

        /// <summary>
        /// Calcule distance entre deux points GPS (formule de Haversine)
        /// </summary>
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371; // Rayon de la Terre en km
            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLon = (lon2 - lon1) * Math.PI / 180;
            double lat1Rad = lat1 * Math.PI / 180;
            double lat2Rad = lat2 * Math.PI / 180;
            
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) + 
                      Math.Cos(lat1Rad) * Math.Cos(lat2Rad) * 
                      Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            
            return R * c;
        }

        /// <summary>
        /// Extrait latitude depuis un objet PostGIS Geography
        /// </summary>
        private double ExtractLatitudeFromGeography(dynamic geography)
        {
            if (geography == null) return 0.0;
            
            try
            {
                // Essayer d'extraire depuis l'objet JSON/dynamic
                if (geography.coordinates != null)
                {
                    var coords = geography.coordinates;
                    if (coords.Count >= 2)
                    {
                        return (double)coords[1]; // Latitude = index 1 dans GeoJSON
                    }
                }
                
                // Fallback: essayer de parser comme string PostGIS
                string geoString = geography.ToString();
                // TODO: Parser le format binaire PostGIS si nécessaire
                
                return 0.0; // Coordonnée invalide
            }
            catch
            {
                return 0.0; // En cas d'erreur
            }
        }

        /// <summary>
        /// Extrait longitude depuis un objet PostGIS Geography
        /// </summary>
        private double ExtractLongitudeFromGeography(dynamic geography)
        {
            if (geography == null) return 0.0;
            
            try
            {
                // Essayer d'extraire depuis l'objet JSON/dynamic
                if (geography.coordinates != null)
                {
                    var coords = geography.coordinates;
                    if (coords.Count >= 2)
                    {
                        return (double)coords[0]; // Longitude = index 0 dans GeoJSON
                    }
                }
                
                // Fallback: essayer de parser comme string PostGIS
                string geoString = geography.ToString();
                // TODO: Parser le format binaire PostGIS si nécessaire
                
                return 0.0; // Coordonnée invalide
            }
            catch
            {
                return 0.0; // En cas d'erreur
            }
        }
    }
}