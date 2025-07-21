# Git Profile Picker

![Icon](resources/icon.png)

Einfaches Umschalten zwischen verschiedenen Git-Profilen direkt in VS Code.

## Features
- Profile für verschiedene Git-Identitäten anlegen, bearbeiten und löschen
- Schnell zwischen Profilen wechseln (global oder repository-spezifisch)
- Profile auf ein Repository anwenden oder entfernen
- Übersichtliche Verwaltung über eine eigene Seitenleiste

## Verwendung
1. Öffne die Seitenleiste "Git Profile Picker" (Icon in der Activity Bar)
2. Über das Kontextmenü oder die Aktionsleiste kannst du Profile hinzufügen, bearbeiten, löschen oder anwenden
3. Wähle ein Profil aus, um es global oder für das aktuelle Repository zu aktivieren

## Befehle
- `Git Profile Picker: Profil auswählen`
- `Git Profile Picker: Mit Profil initialisieren`
- `Git Profile Picker: Profil hinzufügen`
- `Git Profile Picker: Profil bearbeiten`
- `Git Profile Picker: Profil löschen`
- `Git Profile Picker: Profil anwenden`
- `Git Profile Picker: Repository de-initialisieren`
- `Git Profile Picker: Aktionen anzeigen`

## Anforderungen
- VS Code Version >= 1.85.0
- Git muss installiert sein

## Installation
1. Über den VS Code Marketplace suchen: **Git Profile Picker**
2. Oder manuell mit der `.vsix`-Datei installieren:
   - `code --install-extension git-profile-picker-0.1.0.vsix`

## Konfiguration
Keine zusätzliche Konfiguration notwendig. Profile werden in einer JSON-Datei gespeichert.

## Lizenz
MIT

---

[GitHub Repository](https://github.com/scorpion81/git-profile-picker)
