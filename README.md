# 3D Car Driving Game (Three.js)

A browser-based 3D driving game built with plain JavaScript and Three.js.

## Features

- Drivable 3D car using **WASD** or **Arrow keys**
- Third-person camera that follows the car
- Roads, city buildings, and world boundaries
- Speed, steering, acceleration, reverse, friction, and braking
- Collision detection against walls/buildings
- Distance-based score counter
- Mobile touch controls + desktop keyboard controls
- UI with speed meter, score, and restart button

## Project Structure

```text
/
|-- index.html
|-- style.css
|-- main.js
|-- README.md
|-- assets/
    |-- car-model/
    |-- textures/
```

## Run

No backend is required.

1. Download or clone this repository.
2. Open `index.html` in a browser.

> For best compatibility/security behavior in some browsers, you can also run a local static server.

## Controls

### Desktop

- `W` / `ArrowUp`: Accelerate
- `S` / `ArrowDown`: Reverse
- `A` / `ArrowLeft`: Steer left
- `D` / `ArrowRight`: Steer right
- `Space`: Brake

### Mobile

Use the touch controls shown at the bottom-right:
- ▲ accelerate
- ▼ reverse
- ◀ / ▶ steer
- ■ brake

## Notes for GitHub Pages

The game is fully static (HTML/CSS/JS), so it works on GitHub Pages with no backend setup.
