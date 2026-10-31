# ClassSaver — Intelligent Energy Guardian

## Interactive smart-building dashboard
- Build a premium, fully responsive single-page website with a dark black/navy background, glowing blue, purple, cyan, and green accents, glassmorphism cards, smooth animations, modern typography, and a professional robotics-inspired UI.
- Make the 3D classroom the homepage centrepiece.

## Dashboard telemetry and charts
- Display live energy consumed, energy saved, money saved in ₹, automatic switch-offs, classroom occupancy, temperature, brightness, and ESP32 Wi-Fi status.
- Include animated statistics and responsive Chart.js energy visualizations that update from the active live or demo data source.

## 3D classroom centrepiece
- Create an interactive Three.js classroom with three ceiling tube lights, one rotating ceiling fan, desks, chairs, blackboard, windows, door, PIR, LDR, DHT22, and an ESP32 control unit.
- Make lights visibly glow when ON and make the fan rotate when ON and stop when OFF.
- Allow users to rotate and zoom the classroom.

## Automation and safety logic
- Use PIR occupancy, LDR brightness, and DHT22 temperature in AUTO mode.
- Turn lights ON when occupied and dark; turn lights OFF when empty or bright.
- Turn the fan ON at 30°C and OFF at 28°C.
- Switch off outputs after a configurable empty-room timeout.

## Controls and connection integrity
- Provide AUTO/MANUAL modes, individual controls for all three lights, an all-lights control, and a fan control.
- Support an existing Wi-Fi router or mobile hotspot through an HTTP API or WebSockets connection path.
- Clearly separate LIVE and DEMO modes and never present simulated data as a real ESP32 connection.
