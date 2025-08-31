# 🚨 PROBLÈME CRITIQUE - Support LengoPay

## Objet : Payment ID différents entre création et callback

Bonjour l'équipe LengoPay,

Nous rencontrons un problème critique avec vos callbacks de paiement.

## Le problème en résumé :

Quand nous créons un paiement, vous nous donnez un payment_id. Mais quand vous envoyez le callback après paiement réussi, le payment_id est complètement différent.

## Exemple concret avec nos données :

**ÉTAPE 1 - Création du paiement :**
- Nous créons un paiement via votre API
- Vous nous retournez le payment_id : `SUZwTHVEZDkwRzZxWjRQeGlGSFFWSU9JUUJoaVBwOFk=`
- Nous stockons ce payment_id dans notre base de données avec toutes les informations importantes
- L'utilisateur clique sur le lien de paiement

**ÉTAPE 2 - Callback après paiement :**
- L'utilisateur paie avec succès
- Vous nous envoyez un callback POST sur notre URL
- Dans ce callback, le payment_id est : `IFpLuDd90G6qZ4PxiFHQVIOIQBhiPp8Y`
- Ce payment_id est COMPLÈTEMENT DIFFÉRENT de celui de l'étape 1

## Conséquences de ce problème :

1. Nous ne pouvons pas associer le callback au paiement original
2. Nous perdons toutes les informations liées au paiement initial
3. Nos notifications automatiques ne fonctionnent plus
4. Nous nous retrouvons avec des données dupliquées et incohérentes

## Ce que nous attendons :

Le payment_id dans le callback doit être le MÊME que celui fourni lors de la création du paiement.

## Nos données de test :

- **Payment_id initial** : SUZwTHVEZDkwRzZxWjRQeGlGSFFWSU9JUUJoaVBwOFk=
- **Payment_id callback** : IFpLuDd90G6qZ4PxiFHQVIOIQBhiPp8Y
- **Date du test** : 26 août 2025
- **Environnement** : Sandbox
- **Montant** : 8000 GNF

## Question urgente :

Est-ce un bug de votre côté ou y a-t-il une configuration particulière pour que le payment_id reste identique ?

Ce problème bloque complètement notre système de notification automatique.

Merci de votre aide urgente.

Cordialement,
L'équipe LokoTaxi