-- Script pour créer la base de données DCC
-- Exécutez ce script avec : mysql -u root -p < create_database.sql

CREATE DATABASE IF NOT EXISTS dcc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Afficher un message de confirmation
SELECT 'Base de données dcc_db créée avec succès!' AS message;
