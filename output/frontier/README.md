# Frontier fullscreen UI

The four frontier maps use the owner's `files/UI map Zone1/UI2-frontier.jpg` layout: resources at the upper left, a permanent return button at the upper center, pause/settings at the upper right, and Yama/guide/bag at the lower left. The canvas fills the viewport; portrait screens follow the player without stretching the background. Opening a menu and closing it returns to the existing frontier session.

`src/frontier-navigation.js` follows the unshaded area in `UI2-frontier-w.jpg` for Zone 1. Each other zone has its own building, water or machinery exclusions. Both Yama and arriving enemies use routes around obstacles; keyboard movement cannot cross those same boundaries. Guard and Nira stand by the upper gate; the Guard asset is selected by zone through the image manifest, including the approved proportion revisions.

Open `walkable.html` to review the actual navigation polygons. The local, uncommitted `preview.html` fixture tests the actual game UI using a copied UI module and disposable game state, with saving suppressed. Its four zone buttons are test controls and do not appear in the game. The production implementation is in `src/ui.js`, `src/frontier.js`, `src/frontier-navigation.js`, `src/art.js` and `index.html`.

Validation: the full Node suite passed 215 tests. Focused navigation, frontier session and asset checks passed again after the final camera and asset changes. Browser checks covered all four maps, walking to Nira, bag return, pause/resume, and zone-specific CyberHell Guard rendering on a portrait viewport. Screenshots are saved in this folder.
