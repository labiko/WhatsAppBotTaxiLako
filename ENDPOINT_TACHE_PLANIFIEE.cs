
        public async Task<ActionResult> ProcessWhatsAppNotifications()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

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

                            if (notificationType == "auto_cancellation")
                            {
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
                            }
                            else
                            {
                                // Traitement normal - conducteur assigné
                                // 2. Récupérer réservation avec conducteur
                                var resUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{notif.reservation_id}&select=*,conducteurs(*)";
                                var resResponse = await httpClient.GetStringAsync(resUrl);
                                var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                                if (reservations.Length > 0)
                                {
                                    var res = reservations[0];
                                    var cond = res.conducteurs;

                                    logMessages.Add($"🚖 Conducteur: {cond.prenom} {cond.nom} pour client: {res.client_phone}");

                                    // 3. Calculer temps d'arrivée dynamique
                                    var distanceKm = res.distance_km != null ? (decimal)res.distance_km : 5m;
                                    var etaMinutes = Math.Max(5, (int)Math.Round(distanceKm * 3)); // 3 min par km minimum 5 min

                                    // 4. Message WhatsApp ultra-compact
                                    var message = $@"✅ *CONDUCTEUR ASSIGNÉ*

                                  🚖 *{cond.prenom} {cond.nom}* • ⭐ {((decimal?)cond.note_moyenne ?? 4.5m):F1}/5
                                  📱 {cond.telephone}
                                  🚗 {cond.vehicle_couleur} {cond.vehicle_marque} {cond.vehicle_modele}
                                  🏷️ {cond.vehicle_plaque}

                                  💰 *{res.prix_total ?? 0} GNF* • Arrivée dans ⏰ *{etaMinutes} min*

                                  Le conducteur vous contactera bientôt. Bon voyage! 🛣️";

                                    // 5. Envoyer WhatsApp via Twilio
                                    using (var twilioClient = new HttpClient())
                                    {
                                        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{twilioSid}:{twilioToken}"));
                                        twilioClient.DefaultRequestHeaders.Add("Authorization", $"Basic {credentials}");

                                        var formData = new FormUrlEncodedContent(new[]
                                        {
                              new KeyValuePair<string, string>("From", $"whatsapp:{twilioNumber}"),
                              new KeyValuePair<string, string>("To", $"whatsapp:{res.client_phone}"),
                              new KeyValuePair<string, string>("Body", message)
                          });

                                        var twilioResponse = await twilioClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json", formData);

                                        if (twilioResponse.IsSuccessStatusCode)
                                        {
                                            logMessages.Add($"✅ WhatsApp envoyé à {res.client_phone}");
                                        }
                                        else
                                        {
                                            var errorText = await twilioResponse.Content.ReadAsStringAsync();
                                            logMessages.Add($"❌ Erreur Twilio {twilioResponse.StatusCode}: {errorText}");
                                            continue;
                                        }
                                    }

                                    var markSuccess = await MarkNotificationAsProcessedAsync(notif.id.ToString(), httpClient, supabaseUrl, supabaseKey, logMessages);
                                    logMessages.Add($"📝 Notification marquée comme traitée: {markSuccess}");

                                    processedCount++;
                                }
                                else
                                {
                                    logMessages.Add($"⚠️ Réservation {notif.reservation_id} non trouvée");
                                }
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

                    // Envoyer WhatsApp via Twilio
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

                        logMessages.Add($"🔍 Envoi Twilio vers: {normalizedPhone}");

                        var twilioResponse = await twilioClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json", formData);
                        
                        logMessages.Add($"🔍 Réponse Twilio: {twilioResponse.StatusCode}");
                        
                        if (!twilioResponse.IsSuccessStatusCode)
                        {
                            var errorContent = await twilioResponse.Content.ReadAsStringAsync();
                            logMessages.Add($"❌ Erreur Twilio: {errorContent}");
                        }

                        return twilioResponse.IsSuccessStatusCode;
                    }
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
