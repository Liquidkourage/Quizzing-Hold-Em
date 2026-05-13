> Layout sketch for the public **8-player** table view. For show flow and phases, see [round-machine.md](./round-machine.md).

# 8 Players Layout on Public Display

## Visual Markup

```
                    ┌─────────────────┐
                    │   [Player 0]    │
                    │     Alice       │
                    │     $1000       │
                    │   [🃏] [🃏]     │
                    └─────────────────┘
                           ↑
                           |
                           |
    ┌─────────────────┐    |    ┌─────────────────┐
    │   [Player 7]    │    |    │   [Player 1]    │
    │     Grace       │    |    │      Bob        │
    │     $1500       │    |    │     $800        │
    │   [🃏] [🃏]     │    |    │   [🃏] [🃏]     │
    └─────────────────┘    |    └─────────────────┘
           ←───────────────┼────────────────→
                           |
                           |
    ┌─────────────────┐    |    ┌─────────────────┐
    │   [Player 6]    │    |    │   [Player 2]    │
    │     Frank       │    |    │     Carol       │
    │     $1200       │    |    │     $950        │
    │   [🃏] [🃏]     │    |    │   [🃏] [🃏]     │
    └─────────────────┘    |    └─────────────────┘
                           |
                           |
                    ┌─────────────────┐
                    │   [Player 5]    │
                    │     Eve         │
                    │     $1100       │
                    │   [🃏] [🃏]     │
                    └─────────────────┘
                           ↑
                           |
                           |
    ┌─────────────────┐    |    ┌─────────────────┐
    │   [Player 4]    │    |    │   [Player 3]    │
    │     Dave        │    |    │     Dan         │
    │     $1300       │    |    │     $900        │
    │   [🃏] [🃏]     │    |    │   [🃏] [🃏]     │
    └─────────────────┘    |    └─────────────────┘

                    ┌─────────────────────────────────┐
                    │                                 │
                    │         🃏 🃏 🃏 🃏 🃏           │
                    │                                 │
                    │           Pot: $0               │
                    │                                 │
                    │         🃏 🃏 🃏 🃏 🃏           │
                    │                                 │
                    └─────────────────────────────────┘
```

## Technical Specifications

### Player Container Details:
- **Size**: 160px × 140px (scaled to 120px × 105px with `scale-75`)
- **Style**: Black background with yellow border
- **Content**: Player name, bankroll, and 2 face-down cards
- **Positioning**: 320px radius from table center

### Positioning Angles:
- **Player 0**: 0° (top)
- **Player 1**: 45° (top-right)
- **Player 2**: 90° (right)
- **Player 3**: 135° (bottom-right)
- **Player 4**: 180° (bottom)
- **Player 5**: 225° (bottom-left)
- **Player 6**: 270° (left)
- **Player 7**: 315° (top-left)

### Table Details:
- **Size**: 600px × 450px
- **Shape**: Rounded green felt
- **Center Elements**: Pot display and community cards
- **Position**: Centered in the game area

### Animation:
- Players appear with staggered delays (0.1s between each)
- Scale animation from 0 to 1
- Opacity fade-in effect

## Layout Benefits:
- ✅ Even distribution around the table
- ✅ No overlapping player containers
- ✅ Clear visibility of all players
- ✅ Balanced spacing and proportions
- ✅ Responsive to different screen sizes
