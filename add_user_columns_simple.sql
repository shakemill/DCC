-- Script simplifié pour ajouter les colonnes manquantes à la table users
-- Exécutez ce script avec : mysql -u dccuser -p dccdatabase < add_user_columns_simple.sql
-- OU connectez-vous à MySQL et copiez-collez ces commandes

USE dccdatabase;

-- Ajouter emailVerified (BOOL, défaut FALSE)
-- Note: Si la colonne existe déjà, vous obtiendrez une erreur - c'est normal, ignorez-la
ALTER TABLE users 
ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT FALSE;

-- Ajouter verificationToken (VARCHAR nullable)
ALTER TABLE users 
ADD COLUMN verificationToken VARCHAR(255) NULL;

-- Ajouter verificationTokenExpires (TIMESTAMP nullable)
ALTER TABLE users 
ADD COLUMN verificationTokenExpires TIMESTAMP(6) NULL;

-- Vérifier la structure finale
DESCRIBE users;

SELECT 'Colonnes ajoutées avec succès!' AS message;
