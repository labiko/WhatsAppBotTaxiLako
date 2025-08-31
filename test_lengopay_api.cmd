@echo off
echo ===========================================
echo TEST API LENGOPAY - PAIEMENT MOBILE MONEY
echo ===========================================
echo.

REM Configuration
set API_URL=https://sandbox.lengopay.com/api/v1/payments
set LICENSE_KEY=VmVHNGZud2h1YVdUUnBSYnZ1R3BlNmtMTFhHN1NDNGpaU3plMENtQ1drZ084Y280S2J5ODZPWXJQVWZRT25OWg==
set WEBSITE_ID=wyp6J7uN3pVG2Pjn
set CALLBACK_URL=http://localhost/api/LengoPayCallback

echo Configuration:
echo - API URL: %API_URL%
echo - Website ID: %WEBSITE_ID%
echo - Callback URL: %CALLBACK_URL%
echo.

echo Test 1: Paiement Mobile Money Orange (7000 GNF)
echo -----------------------------------------------
curl -X POST "%API_URL%" ^
  -H "Authorization: Basic %LICENSE_KEY%" ^
  -H "Accept: application/json" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":\"7000\",\"currency\":\"GNF\",\"websiteid\":\"%WEBSITE_ID%\",\"type_account\":\"lp-om-gn\",\"account\":\"628406028\",\"callback_url\":\"%CALLBACK_URL%\"}"

echo.
echo.

echo Test 2: Paiement Mobile Money avec montant different (15000 GNF)
echo ------------------------------------------------------------------
curl -X POST "%API_URL%" ^
  -H "Authorization: Basic %LICENSE_KEY%" ^
  -H "Accept: application/json" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":\"15000\",\"currency\":\"GNF\",\"websiteid\":\"%WEBSITE_ID%\",\"type_account\":\"lp-om-gn\",\"account\":\"628406028\",\"callback_url\":\"%CALLBACK_URL%\",\"return_url\":\"http://localhost/payment-success\"}"

echo.
echo.

echo Test 3: Paiement sans callback (test basique)
echo ----------------------------------------------
curl -X POST "%API_URL%" ^
  -H "Authorization: Basic %LICENSE_KEY%" ^
  -H "Accept: application/json" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":\"5000\",\"currency\":\"GNF\",\"websiteid\":\"%WEBSITE_ID%\"}"

echo.
echo.
echo Tests termines. Verifiez les URLs de paiement retournees.
pause