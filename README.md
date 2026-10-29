# Site de présentation de Manger!

Site vitrine de [**Manger!**](https://codeberg.org/LION_LAB/manger), le planificateur de repas libre et auto-hébergeable de l'association Lion Lab.

## Principes

- 100 % statique : HTML, CSS et JavaScript sans framework ni étape de build ;
- aucune ressource tierce : polices auto-hébergées, ni cookie, ni traceur, ni CDN ;
- clair / sombre automatique, compatible mobile, respecte `prefers-reduced-motion`.

## Aperçu local

```shell
python3 -m http.server 8000
```

Puis <http://localhost:8000>. Passer par un serveur HTTP plutôt que d'ouvrir `index.html` directement : les navigateurs bloquent le chargement des polices en `file://`.

## Déploiement

N'importe quel hébergement de fichiers statiques convient : Codeberg Pages, GitHub Pages, ou un simple serveur web.

```shell
docker run -d --name manger-site -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine
```

## Structure

```
index.html           page unique
assets/css/style.css styles et animations
assets/js/main.js    interactions (démos courses et foyer, scrollytelling, terminal)
assets/fonts/        Fraunces et Inter (SIL Open Font License 1.1)
assets/favicon.svg   logo
```

## Licences

Polices : Fraunces et Inter sous SIL Open Font License 1.1 (voir `assets/fonts/`).
