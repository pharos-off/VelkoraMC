# 🎮 CraftLauncher

Un launcher **Minecraft complet et moderne** offrant une expérience utilisateur exceptionnelle avec authentification Microsoft, gestion des profils, optimisation des ressources, et bien plus encore!

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-CLv1-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

---

## ✨ Fonctionnalités principales

### 🔐 Authentification
- ✅ **Authentification Microsoft** - Connexion sécurisée avec votre compte Microsoft
- ✅ **Mode hors-ligne** - Jouez sans connexion Internet
- ✅ **Gestion de compte** - Voir et gérer vos informations de compte

### ⚙️ Gestion des profils
- ✅ **Profils multiples** - Créez plusieurs profils avec différentes versions de Minecraft
- ✅ **Duplication rapide** - Dupliquez facilement un profil existant
- ✅ **Édition intuitive** - Modifiez vos profils en quelques clics

### 🧩 Gestionnaire de Mods
- ✅ **Gestion complète** - Importez, activez/désactivez et supprimez des mods
- ✅ **Aperçu rapide** - Consultez la liste de vos mods avec infos (version, taille)
- ✅ **Accès facile** - Ouvrez directement le dossier mods depuis l'app

### 📊 Statistiques et optimisation
- ✅ **Optimisation RAM** - Allocation automatique basée sur vos ressources système
- ✅ **Historique de jeu** - Suivez votre temps de jeu et vos sessions
- ✅ **Infos système** - Consultez l'utilisation du stockage et la RAM disponible

### 🎮 Intégrations
- ✅ **Discord Rich Presence** - Affichez votre statut de jeu sur Discord
- ✅ **Actualités Minecraft** - Restez informé des dernières news officielles
- ✅ **Partenaires** - Découvrez les serveurs et projets partenaires

### 🔔 Notifications et paramètres
- ✅ **Notifications en temps réel** - Recevez des alertes pour les événements importants
- ✅ **Paramètres complets** - Personnalisez chaque aspect de l'application
- ✅ **Thème moderne** - Interface élégante et responsive

### 🚀 Mises à jour automatiques
- ✅ **Vérification automatique** - L'app cherche les nouvelles versions au démarrage
- ✅ **Installation en 1 clic** - Mettez à jour directement depuis les paramètres
- ✅ **Téléchargement depuis GitHub** - Mises à jour fiables et sécurisées

### 📜 Conditions d'utilisation
- ✅ **Acceptation une fois** - Les conditions s'affichent une seule fois après la connexion
- ✅ **Licence MIT** - Utilisez et modifiez librement le code source
- ✅ **Transparent** - Voir exactement ce que nous faisons de vos données

---

## 🚀 Installation

### Prérequis
- **Node.js** 14+ et **npm**
- **Electron** (installé automatiquement)
- **Windows, macOS ou Linux**

### Depuis les releases

1. Téléchargez la dernière version depuis [GitHub Releases](https://github.com/pharos-off/minecraft-launcher/releases)
2. Exécutez l'installateur
3. Lancez CraftLauncher !

---

## 📖 Utilisation

### Première connexion
1. Cliquez sur **"Connexion Microsoft"** pour vous authentifier
2. Acceptez les conditions d'utilisation
3. Créez ou sélectionnez un profil
4. Lancez le jeu !

### Gestion des profils
- **Créer** : Cliquez sur "+ Créer un profil"
- **Modifier** : Cliquez sur ✏️ à côté du profil
- **Dupliquer** : Cliquez sur 📋 pour copier rapidement un profil
- **Supprimer** : Cliquez sur 🗑️ (non disponible pour le profil par défaut)

### Gestion des mods
1. Allez à l'onglet **"Mods"**
2. Cliquez sur **"Importer un Mod"** et sélectionnez des fichiers `.jar`
3. Cochez/décochez pour activer/désactiver les mods
4. Cliquez sur 🗑️ pour supprimer un mod

### Raccourcis clavier
- `Ctrl+L` - Lancer le jeu
- `Ctrl+S` - Ouvrir les paramètres
- `Ctrl+H` - Aller à l'accueil

---

## 🛠️ Développement

### Technologies utilisées
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Backend** : Node.js, Electron
- **Base de données** : electron-store (stockage JSON local)
- **Authentification** : Microsoft OAuth 2.0
- **Intégrations** : Discord RPC, Minecraft API

## 🐛 Bugs et suggestions

Avez-vous trouvé un bug ou avez une suggestion ?
- 📝 Ouvrez une [Issue](https://github.com/pharos-off/minecraft-launcher/issues)
- 🤝 Créez une [Pull Request](https://github.com/pharos-off/minecraft-launcher/pulls)
- 💬 Contactez-nous : [contact.craftlauncher@gmail.com](mailto:contact.craftlauncher@gmail.com)

---

## 📄 Licence

### CraftLauncher License v1 (CLv1)

**Copyright © 2026 Eloan**

CraftLauncher est fourni sous la **Licence CraftLauncher v1 (CLv1)**, une licence personnalisée qui combine les droits de la licence MIT avec des conditions supplémentaires spécifiques à ce projet.

#### Conditions principales :

✅ **Vous pouvez :**
- Utiliser CraftLauncher à titre personnel ou commercial

❌ **Vous ne pouvez pas :**
- Retirer les mentions de copyright ou de licence
- Utiliser le nom "CraftLauncher" pour un produit concurrent
- Prétendre être l'auteur original
- Tenir les auteurs responsables des dommages causés
- Modifier le code source
- Distribuer le code modifié
- Vendre des versions modifiées
- Utiliser à des fins éducatives

#### Texte complet de la licence CLv1

```
Licence d’utilisation – CraftLauncher

Copyright © 2026 Eloan. Tous droits réservés.

Ce logiciel est un logiciel propriétaire.

L’auteur accorde à l’utilisateur une licence personnelle, non exclusive,
non transférable, permettant uniquement l’utilisation du logiciel.

Il est strictement interdit de :
- copier, redistribuer ou revendre le logiciel
- modifier, adapter ou créer des œuvres dérivées
- décompiler, désassembler ou tenter d’extraire le code source
- publier tout ou partie du code ou du logiciel

Tous les droits non expressément accordés sont réservés à l’auteur.

Toute utilisation non autorisée constitue une violation du Code
de la propriété intellectuelle et peut donner lieu à des poursuites.

En utilisant ce logiciel, vous acceptez les termes de cette licence.
```

---

## 🙏 Remerciements

- **Microsoft** - Pour Minecraft et l'authentification Microsoft
- **Electron** - Pour le framework desktop
- **Discord** - Pour l'API Rich Presence
- **Tous les contributeurs** - Pour vos suggestions et bug reports

---

## 📞 Contact

- **Email** : [contact.craftlauncher@gmail.com](mailto:contact.craftlauncher@gmail.com)
- **GitHub** : [@Pharsos](https://github.com/pharos-off)
- **Discord** : Rejoignez notre serveur communautaire

---

## 📈 Feuille de route

### v3.0.0 ✅ (Actuelle)
- ✅ Authentification Microsoft
- ✅ Gestion des profils
- ✅ Gestionnaire de mods
- ✅ Discord RPC
- ✅ Mises à jour automatiques

### v3.1.0 🚀 (Prochainement)
- ⏳ Téléchargement de mods depuis CurseForge
- ⏳ Gestionnaire de sauvegardes
- ⏳ Support des datapacks
- ⏳ Statistiques avancées

### v4.0.0 🎯 (Futur)
- ⏳ Support natif macOS/Linux
- ⏳ Installation de shaders
- ⏳ Serveur multi-joueurs intégré
- ⏳ Marketplace de mods

---

## 📊 Statistiques

![GitHub Stars](https://img.shields.io/github/stars/pharos-off/minecraft-launcher?style=social)
![GitHub Forks](https://img.shields.io/github/forks/pharos-off/minecraft-launcher?style=social)
![GitHub Watchers](https://img.shields.io/github/watchers/pharos-off/minecraft-launcher?style=social)

---

<div align="center">

**Fait avec ❤️ par [Pharos](https://github.com/pharos-off)**

Rejoignez notre communauté et aidez-nous à améliorer CraftLauncher !

[⭐ Star sur GitHub](https://github.com/pharos-off/minecraft-launcher) • [🐛 Signaler un bug](https://github.com/pharos-off/minecraft-launcher/issues) • [💬 Discuter](https://github.com/pharos-off/minecraft-launcher/discussions)

</div>
