-- Script pour ajouter les colonnes manquantes à la table users
-- Exécutez ce script avec : mysql -u dccuser -p dccdatabase < add_user_columns.sql

USE dccdatabase;

-- Ajouter la colonne emailVerified si elle n'existe pas
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "emailVerified";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column emailVerified already exists.' AS message;",
  "ALTER TABLE users ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT FALSE;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ajouter la colonne verificationToken si elle n'existe pas
SET @columnname = "verificationToken";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column verificationToken already exists.' AS message;",
  "ALTER TABLE users ADD COLUMN verificationToken VARCHAR(255) NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ajouter la colonne verificationTokenExpires si elle n'existe pas
SET @columnname = "verificationTokenExpires";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column verificationTokenExpires already exists.' AS message;",
  "ALTER TABLE users ADD COLUMN verificationTokenExpires TIMESTAMP(6) NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Vérifier la structure finale de la table
DESCRIBE users;

SELECT 'Colonnes ajoutées avec succès!' AS message;
