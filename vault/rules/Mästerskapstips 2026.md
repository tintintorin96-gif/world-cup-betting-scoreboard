# Mästerskapstips 2026

Competition rules and parser contract for World Cup Betting Scoreboard.

## Scoring Config (machine-readable)

```json
{
  "maxPoints": 657,
  "rules": {
    "group_exact_score": 5,
    "group_correct_outcome": 2,
    "group_wrong_outcome": 0,
    "group_winner": 5,
    "knockout_r32": 2,
    "knockout_r16": 5,
    "knockout_qf": 10,
    "knockout_sf": 15,
    "knockout_third_reach": 15,
    "knockout_third_winner": 15,
    "finalist": 20,
    "champion": 25
  }
}
```

## Parser Contract

Participant files must include these exact H2 headings:

- `## Group Stage Predictions`
- `## Predicted Group Standings`
- `## Predicted Group Winners`
- `## Knockout Predictions`
- `## Score Summary` (optional)

Group matches use `| Match | Prediction |` tables with `Team vs Team` and `2-1` scores.
