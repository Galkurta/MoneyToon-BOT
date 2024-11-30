# MoneyToon Bot Automation

An automation script for MoneyToon tasks and games using Node.js.

## Features

- Multi-account support
- Automatic daily check-in
- Task completion automation
- Game automation (MahJong, Matching, Sliding)
- Free SL Pass reward claiming
- Automatic egg opening
- 24-hour continuous operation
- Colored console output
- Error handling and retry mechanism

## Prerequisites

- Node.js v14 or higher
- NPM package manager

## Installation

1. Clone the repository

```bash
git clone https://github.com/Galkurta/MoneyToon-BOT
cd MoneyToon-BOT
```

2. Install dependencies

```bash
npm install
```

3. Create a `data.txt` file in the project root and add your account tokens (one per line)

```
Bearer token1
Bearer token2
...
```

## Configuration

The script includes several configurable options in the `CONFIG` object:

- Retry attempts and delays
- Game settings
- Time intervals between actions
- And more...

## Getting Started

1. Register on MoneyToon: [Registration Link](https://t.me/moneytoon_bot/myApp?startapp=00669E)
2. Get your Bearer token from the web app
3. Add your token to data.txt
4. Run the bot:

```bash
node main.js
```

## Features Explained

- **Daily Check-in**: Automatically performs daily check-in for rewards
- **Task Completion**: Completes available daily tasks
- **Game Automation**: Plays available games with proper level selection based on friend count
- **Free SL Pass**: Claims free SL Pass rewards automatically
- **Multi-Account**: Processes multiple accounts sequentially
- **Continuous Operation**: Runs in 24-hour cycles with automatic restart

## Note

- The script only claims FREE SL Pass rewards (not premium)
- Requires at least 1 friend for medium difficulty games
- Requires 3 friends for hard difficulty games
- Running time between actions is randomized to avoid detection

## Disclaimer

This script is for educational purposes only. Use at your own risk and make sure to comply with MoneyToon's terms of service.

## Support

For issues or questions, please open an issue in the GitHub repository.

## License

MIT License - feel free to use and modify as needed.
