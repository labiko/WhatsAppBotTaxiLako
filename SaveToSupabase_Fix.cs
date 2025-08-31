/// <summary>
/// VERSION CORRIGÉE - SaveToSupabase pour remplacer dans LengoPayCallbackService.cs
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
            processed_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };

        string jsonPayload = JsonConvert.SerializeObject(paymentData);
        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📦 Payload: {jsonPayload}");

        using (var client = new WebClient())
        {
            client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
            client.Headers["apikey"] = supabaseKey;
            client.Headers[HttpRequestHeader.ContentType] = "application/json";
            client.Headers["Prefer"] = "resolution=merge-duplicates";
            client.Encoding = Encoding.UTF8;

            string upsertUrl = $"{supabaseUrl}/rest/v1/lengopay_payments";
            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔄 URL: {upsertUrl}");
            
            string response = client.UploadString(upsertUrl, "POST", jsonPayload);
            
            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📥 Réponse: {response}");
            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Sauvegardé en base via API REST");
            
            // Si c'est un succès, chercher une réservation potentielle à lier
            if (payment.status?.ToUpper() == "SUCCESS" && !string.IsNullOrEmpty(payment.Client))
            {
                LinkToReservationViaAPI(payment);
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