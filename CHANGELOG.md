# Changelog

## [4.7.1] - Sécurisation et stabilisation du launcher

- Correction de la détection des loaders installés : les profils peuvent maintenant retrouver un loader installé dans le dossier Minecraft principal, même lorsqu'ils utilisent un répertoire de profil distinct.
- Correction du lancement Fabric, Forge, NeoForge et Quilt : le loader sélectionné dans l'accueil est désormais réellement transmis à Minecraft.
- Correction de l'état de lancement bloqué lorsque Minecraft se ferme immédiatement ou est fermé trop tôt ; le bouton de lancement et l'état interne sont maintenant réinitialisés de façon fiable.
- Suppression du blocage artificiel après la fermeture du jeu afin de permettre un nouveau lancement sans redémarrer le launcher.
- Validation du profil Minecraft Microsoft avant le lancement et renouvellement du jeton en cas de session expirée, afin de limiter les erreurs « Invalid session ».
- Ajout d'un bouton de don PayPal ouvrant `https://paypal.me/PharosOff`.
- Ajout d'un message expliquant que Velkora est développé seul et que sa maintenance demande beaucoup de temps.