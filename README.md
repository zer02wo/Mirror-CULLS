<img src="img/logo.png" alt="Mirror-CULLS Logo" height="240">

# Mirror-CULLS

Wave hello to the **miracle** of IoT and smarthome devices.

## Description

A contactless gesture controlled smart-mirror device and OS with modular applications built.

My final year project for my university course in Computer Science.

## Features

* Integration with a number of APIs including: Spotify, FitBit, GoogleMaps and more!

* A modular and smartphone-style approach to architecture to allow extensibility and maintainability.

* Contact-free gesture controls using a PAJ7620U2 sensor integrated via Python.

* Built with Node.js on the Electron application for performance, low-level access and cross-platform support.

* Originally built with a Raspberry-Pi as the heart of the project, a 3D-printed skeleton and a Hyperpixel display as the face of it all.

## Note

Please note that this was originally developed on a private university version control account that I no longer have access to, hence the lack of commit history within this repo.

## Demo

### Home & Clock
* Modular app select screen and clock with selectable themes
  * Design inspired by modern _smart_ device interfaces
* Navigate home screen by gestures:
  * **Up/Down/Left/Right:** move cursor in gesture direction
  * **Wave:** open app/module

https://user-images.githubusercontent.com/50022197/169397345-8628891b-8e4d-4776-afbd-564e52df9396.mov

* Custom clock theme developed with vanilla JavaScript
  * Design inspired by *Tron* movies
* Control clock by gestures:
  * **Up/Down/Left/Right:** move switch between clock faces/themes
  * **Wave:** navigate to home screen

### Spotify

* Music player powered by Spotify API
  * Design inspired by *Gramaphone* record players  
* Control playback by gestures:
  * **Up:** lower playback volume 
  * **Down:** increase playback volume
  * **Left:** play previous track in queue
  * **Right:** play next track in queue
  * **Clockwise:** toggle shuffle tracklist
  * **Anti-clockwise:** toggle repeat tracklist
  * **Forward:** play/pause track
  * **Backward:** play/pause track
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169396815-5989df8f-a76b-410f-9fc6-e6712540cbdd.mov

### FitBit

* Fitness, sleep and nutrition dashboard powered by FitBit API
  * Design inspired by _Fitbit_ mobile app
* Control view by gestures:
  * **Left:** display previous view
  * **Right:** display next view
  * **Wave:** navigate to home

https://user-images.githubusercontent.com/50022197/169397844-76f79807-039d-4e12-9047-88fe71459402.mov

### Google Maps

* Interactive map with traffic display powered by GoogleMaps API
  * Custom map style designed to be cohesive with Mirror-CULLS design language
* Control map by gestures:
  * **Up/Down/Left/Right:** pan map in gesture direction
  * **Forward:** zoom map in
  * **Backward:** zoom map out
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169398297-4d6da959-bbe7-4184-a928-25fa6d780fe7.mov

### Google Calendar

* Calendar and event reminder powered by GoogleCalendar API
  * Design inspired by _Rolodex_ card holders
* Control calendar by gestures:
  * **Up:** view previous event 
  * **Down:** view next event
  * **Left/Right:** delete calendar event (animate in gesture direction)
  * **Clockwise:** navigate to carousel start (earliest event)
  * **Anti-clockwise:** navigate to carousel end (latest event)
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169398970-d6ae4385-a5fe-4b40-8223-80bd43cf08eb.mov

### 3D

* Interactive 3D environment with simple physics powered by Three JS library
  * Design inspired by _Iron Man_ holographic interface
* Control object by gestures:
  * **Up/Down:** rotate along y-axis in gesture direction (acceleration enabled)
  * **Left/Right:** rotate along x-axis in gesture direction (acceleration enabled)
  * **Clockwise/Anti-clockwise:** rotate along z-axis in gesture direction (acceleration enabled)
  * **Forward/Backward:** reset object to original position
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169401295-c1132db2-4620-4159-b48e-ac150e50ff74.mov

### Pokedex

* Virtual encyclopedia powered by PokeAPI
  * Design inspired by *Pokedex* from *Pokemon* franchise  
* Control view by gestures:
  * **Up/Down:** view random Pokedex entry
  * **Left:** view previous Pokedex entry
  * **Right:** view next Pokedex entry
  * **Clockwise:** view final Pokedex entry
  * **Anti-clockwise:** view first Pokedex entry
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169402362-78c7ce6d-f934-46b4-a1f5-667fd5696156.mov


### Weather

* Weather forecast powered by OpenWeatherMap API
  * Custom design created with power efficiency and mirror-display interaction in mind
* Control view by gestures:
  * **Up:** collapse week forecast view
  * **Down:** open week forecast view
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169403108-fd79e0f6-0813-4c2d-a79e-0d4a3b95f0e7.mov

### News

* News feed powered by ContextualWebSearch API
  * Design inspired by *Gramaphone* record players 
* Control playback by gestures:
  * **Up:** show related search term options
  * **Down:** hide related search term options
  * **Left/Anti-clockwise:** display previous news article
  * **Right/Clockwise:** display next news article
  * **Forward:** get news articles for currently selected search term option
  * **Backward:** get news articles for previous search term
  * **Wave:** navigate to home screen

https://user-images.githubusercontent.com/50022197/169403877-8a93b196-8d96-4b51-9713-8c6bcaefb4c2.mov

## Project Status

**Completed**

(May be revisited in the future to add additional modules/applications).

## License

[MIT](LICENSE)
