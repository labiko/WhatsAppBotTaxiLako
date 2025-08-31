/// <summary>
/// VERSION CORRIGÉE V2 - SaveToSupabase avec gestion INSERT/UPDATE
/// Remplacer dans LengoPayCallbackService.cs
/// </summary>
private void SaveToSupabase(LengoPayCallbackModel payment, string rawJson)
{
    try
    {
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📊 Sauvegarde via API REST Supabase");

        var paymentData = new
        {
            payment_id = payment.pay_id ?? "",
            status = payment.status ?? "UNKNOWN",
            amount = payment.amount,
            currency = "GNF",
            client_phone = payment.Client ?? "",
            message = payment.message ?? "",
            raw_json = JsonConvert.DeserializeObject(rawJson),
            processed_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            updated_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };

        string jsonPayload = JsonConvert.SerializeObject(paymentData);
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📦 Payload: {jsonPayload}");

        using (var client = new WebClient())
        {
            client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
            client.Headers["apikey"] = supabaseKey;
            client.Headers[HttpRequestHeader.ContentType] = "application/json";
            client.Encoding = Encoding.UTF8;

            try
            {
                // Vérifier si le payment_id existe déjà
                string checkUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}&select=id";
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔍 Vérification existence: {checkUrl}");
                
                string existingRecord = client.DownloadString(checkUrl);
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📋 Résultat recherche: {existingRecord}");
                
                string response = "";
                
                if (existingRecord == "[]" || string.IsNullOrEmpty(existingRecord)) 
                {
                    // Nouveau paiement - INSERT avec POST
                    client.Headers["Prefer"] = "return=representation";
                    string insertUrl = $"{supabaseUrl}/rest/v1/lengopay_payments";
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🆕 INSERT nouveau paiement");
                    
                    response = client.UploadString(insertUrl, "POST", jsonPayload);
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Nouveau paiement créé");
                }
                else 
                {
                    // Paiement existe - UPDATE avec PATCH
                    client.Headers["Prefer"] = "return=representation";
                    string updateUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}";
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔄 UPDATE paiement existant");
                    
                    // Pour un UPDATE, on n'envoie que les champs à modifier
                    var updateData = new
                    {
                        status = payment.status ?? "UNKNOWN",
                        message = payment.message ?? "",
                        processed_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                        updated_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    };
                    string updateJson = JsonConvert.SerializeObject(updateData);
                    
                    response = client.UploadString(updateUrl, "PATCH", updateJson);
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Paiement mis à jour");
                }
                
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📥 Réponse Supabase: {response}");
                
                // Si c'est un succès, chercher une réservation potentielle à lier
                if (payment.status?.ToUpper() == "SUCCESS" && !string.IsNullOrEmpty(payment.Client))
                {
                    LinkToReservationViaAPI(payment);
                }
            }
            catch (WebException innerWebEx)
            {
                string errorDetail = "";
                if (innerWebEx.Response != null)
                {
                    using (var reader = new StreamReader(innerWebEx.Response.GetResponseStream()))
                    {
                        errorDetail = reader.ReadToEnd();
                    }
                }
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Erreur Web: {innerWebEx.Message}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📄 Détails: {errorDetail}");
                throw;
            }
        }
    }
    catch (WebException webEx)
    {
        string errorResponse = "";
        if (webEx.Response != null)
        {
            using (var reader = new StreamReader(webEx.Response.GetResponseStream()))
            {
                errorResponse = reader.ReadToEnd();
            }
        }
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ ERREUR WEB SaveToSupabase: {webEx.Message}");
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📄 Détails erreur: {errorResponse}");
    }
    catch (Exception ex)
    {
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur SaveToSupabase: {ex.Message}");
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📄 Stack trace: {ex.StackTrace}");
    }
}