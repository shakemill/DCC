#!/bin/bash

# Script de diagnostic MySQL pour serveur Contabo
# Usage: ./diagnose-mysql.sh

echo "=========================================="
echo "🔍 Diagnostic MySQL - Serveur Contabo"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier si MySQL est installé
echo "1️⃣  Vérification de l'installation MySQL..."
if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version)
    echo -e "${GREEN}✅ MySQL est installé: $MYSQL_VERSION${NC}"
else
    echo -e "${RED}❌ MySQL n'est pas installé${NC}"
    echo "   Installez-le avec: sudo apt install mysql-server -y"
    exit 1
fi
echo ""

# 2. Vérifier si MySQL est en cours d'exécution
echo "2️⃣  Vérification du statut MySQL..."
if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ MySQL est en cours d'exécution${NC}"
    systemctl status mysql --no-pager | head -n 3
elif systemctl is-active --quiet mariadb; then
    echo -e "${GREEN}✅ MariaDB est en cours d'exécution${NC}"
    systemctl status mariadb --no-pager | head -n 3
else
    echo -e "${RED}❌ MySQL/MariaDB n'est pas en cours d'exécution${NC}"
    echo "   Démarrez-le avec: sudo systemctl start mysql"
    exit 1
fi
echo ""

# 3. Vérifier si le port 3306 est en écoute
echo "3️⃣  Vérification du port 3306..."
if netstat -tlnp 2>/dev/null | grep -q ":3306 " || ss -tlnp 2>/dev/null | grep -q ":3306 "; then
    echo -e "${GREEN}✅ Le port 3306 est en écoute${NC}"
    if command -v netstat &> /dev/null; then
        netstat -tlnp | grep ":3306 "
    else
        ss -tlnp | grep ":3306 "
    fi
else
    echo -e "${RED}❌ Le port 3306 n'est pas en écoute${NC}"
    echo "   MySQL ne semble pas écouter sur le port 3306"
fi
echo ""

# 4. Vérifier la configuration bind-address
echo "4️⃣  Vérification de la configuration bind-address..."
if [ -f /etc/mysql/mysql.conf.d/mysqld.cnf ]; then
    BIND_ADDRESS=$(grep -E "^bind-address" /etc/mysql/mysql.conf.d/mysqld.cnf | awk '{print $3}' || echo "non trouvé")
    if [ -z "$BIND_ADDRESS" ]; then
        BIND_ADDRESS="127.0.0.1 (par défaut)"
    fi
    echo -e "${GREEN}✅ bind-address: $BIND_ADDRESS${NC}"
else
    echo -e "${YELLOW}⚠️  Fichier de configuration non trouvé${NC}"
fi
echo ""

# 5. Vérifier si le fichier .env existe
echo "5️⃣  Vérification du fichier .env..."
if [ -f "/var/www/dcc/.env" ]; then
    echo -e "${GREEN}✅ Fichier .env trouvé${NC}"
    if grep -q "DATABASE_URL" /var/www/dcc/.env; then
        echo -e "${GREEN}✅ DATABASE_URL est défini${NC}"
        # Afficher DATABASE_URL (masquer le mot de passe)
        DB_URL=$(grep "DATABASE_URL" /var/www/dcc/.env | cut -d'=' -f2- | tr -d '"')
        if [[ $DB_URL == *"@"* ]]; then
            DB_URL_MASKED=$(echo $DB_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
            echo "   DATABASE_URL=$DB_URL_MASKED"
        fi
    else
        echo -e "${RED}❌ DATABASE_URL n'est pas défini dans .env${NC}"
    fi
else
    echo -e "${RED}❌ Fichier .env non trouvé dans /var/www/dcc/${NC}"
    echo "   Créez-le avec: nano /var/www/dcc/.env"
fi
echo ""

# 6. Tester la connexion MySQL directe
echo "6️⃣  Test de connexion MySQL..."
echo "   (Cette étape nécessite votre mot de passe MySQL)"
read -p "   Voulez-vous tester la connexion MySQL? (o/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[OoYy]$ ]]; then
    if mysql -u root -p -e "SELECT 1;" 2>/dev/null; then
        echo -e "${GREEN}✅ Connexion MySQL réussie${NC}"
        
        # Vérifier les bases de données
        echo ""
        echo "   Bases de données existantes:"
        mysql -u root -p -e "SHOW DATABASES;" 2>/dev/null | grep -v "Database\|information_schema\|performance_schema\|mysql\|sys"
        
        # Vérifier si dccdb existe
        if mysql -u root -p -e "USE dccdb;" 2>/dev/null; then
            echo -e "${GREEN}✅ La base de données 'dccdb' existe${NC}"
        else
            echo -e "${YELLOW}⚠️  La base de données 'dccdb' n'existe pas${NC}"
            echo "   Créez-la avec: mysql -u root -p -e \"CREATE DATABASE dccdb;\""
        fi
    else
        echo -e "${RED}❌ Échec de la connexion MySQL${NC}"
        echo "   Vérifiez votre mot de passe ou les permissions"
    fi
else
    echo -e "${YELLOW}⏭️  Test de connexion ignoré${NC}"
fi
echo ""

# 7. Vérifier Prisma
echo "7️⃣  Vérification de Prisma..."
if [ -d "/var/www/dcc" ]; then
    cd /var/www/dcc
    if [ -f "package.json" ] && grep -q "prisma" package.json; then
        echo -e "${GREEN}✅ Prisma est installé${NC}"
        
        # Tester la connexion Prisma
        echo "   Test de connexion Prisma..."
        if npx prisma db pull --force 2>&1 | grep -q "error\|Error\|P1001"; then
            echo -e "${RED}❌ Erreur de connexion Prisma${NC}"
            echo "   Vérifiez votre DATABASE_URL dans .env"
        else
            echo -e "${GREEN}✅ Connexion Prisma réussie${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Prisma n'est pas installé${NC}"
    fi
else
    echo -e "${RED}❌ Répertoire /var/www/dcc non trouvé${NC}"
fi
echo ""

# Résumé
echo "=========================================="
echo "📋 Résumé du diagnostic"
echo "=========================================="
echo ""
echo "Si toutes les vérifications sont ✅, votre MySQL devrait fonctionner."
echo ""
echo "🔧 Commandes utiles:"
echo "   - Démarrer MySQL: sudo systemctl start mysql"
echo "   - Redémarrer MySQL: sudo systemctl restart mysql"
echo "   - Voir les logs: sudo tail -f /var/log/mysql/error.log"
echo "   - Se connecter: mysql -u root -p"
echo ""
echo "📖 Consultez MYSQL_TROUBLESHOOTING.md pour plus de détails"
echo ""
