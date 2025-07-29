-- Test direct searchAdressePartial logic pour "donka"
SELECT *
FROM public.adresses 
WHERE actif = true 
  AND (nom ILIKE '%donka%' OR nom_normalise ILIKE '%donka%')
ORDER BY nom
LIMIT 15;