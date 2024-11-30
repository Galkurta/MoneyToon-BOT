const fs = require("fs");
const axios = require("axios");
const displayBanner = require("./config/banner");
const colors = require("./config/colors");
const CountdownTimer = require("./config/countdown");
const logger = require("./config/logger");

const CONFIG = {
  BASE_URL: "https://mt.promptale.io",
  ENDPOINTS: {
    MYPOINT: "/main/mypoint",
    EGG_OPEN: "/rewards/myEggOpen",
    FRIENDS_COUNT: "/user/friendsCount",
    ATTENDANCE_CHECK: "/tasks/isAttendanceToday",
    ATTENDANCE_SUBMIT: "/tasks/attend",
    TASKS_LIST: "/tasks",
    TASKS_COMPLETED_COUNT: "/tasks/completedCount",
    TASK_RUN: "/tasks/taskRun",
    TASK_COMPLETE: "/tasks/taskComplete",
    GAME_STATUS: "/games/status",
    GAME_RUN: "/games/gameRun",
    GAME_COMPLETE: "/games/gameComplete",
    SL_PASS_LIST: "/rewards/mySlPassList",
    SL_PASS_CLAIM: "/rewards/slPassClaim",
  },
  RETRY: {
    ATTEMPTS: 2,
    DELAY: 1000,
  },
  DELAYS: {
    BETWEEN_EGG_OPENS: 300,
    BETWEEN_ACTIONS: 1000,
    BETWEEN_ACCOUNTS: 5,
    NEXT_CYCLE: 24 * 60 * 60, // 24 hours in seconds
  },
  GAMES: {
    NAMES: ["MahJong", "Matching", "Sliding"],
    LEVELS: ["easy", "medium", "hard"],
    REQUIREMENTS: {
      medium: 1,
      hard: 3,
    },
  },
  TOTAL_TASKS: 68, // Total number of available tasks
  HEADERS: {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    Origin: "https://mt.promptale.io",
    Referer: "https://mt.promptale.io/main",
    "Sec-Ch-Ua":
      '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
};

// Retry utility function
async function retryRequest(
  fn,
  retries = CONFIG.RETRY.ATTEMPTS,
  delay = CONFIG.RETRY.DELAY
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1 || error.response?.status !== 500) {
        throw error;
      }

      if (error.response?.status === 500) {
        logger.warn(`Server error, retry ${i + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }
}

class PrompTaleAutomation {
  constructor(token) {
    this.baseUrl = CONFIG.BASE_URL;
    this.headers = {
      ...CONFIG.HEADERS,
      Authorization: `Bearer ${token}`,
    };
  }

  async checkMyPointAndEgg() {
    try {
      const response = await retryRequest(() =>
        axios.get(`${this.baseUrl}${CONFIG.ENDPOINTS.MYPOINT}`, {
          headers: this.headers,
        })
      );

      if (response?.data?.data) {
        const data = response.data.data;
        logger.info(
          `Current points: ${colors.success}${data.point}${colors.reset}`
        );
        logger.info(
          `Boost points: ${colors.info}${data.boostPoint}${colors.reset}`
        );
        logger.info(
          `APY points: ${colors.info}${data.apyPoint}${colors.reset}`
        );
        logger.info(`APY ratio: ${colors.info}${data.apyRatio}${colors.reset}`);

        if (data.egg > 0) {
          logger.info(
            `Found ${colors.success}${data.egg}${colors.reset} egg(s)`
          );
          for (let i = 0; i < data.egg; i++) {
            await this.openEgg();
            if (i < data.egg - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, CONFIG.DELAYS.BETWEEN_EGG_OPENS)
              );
            }
          }
          logger.success("All eggs opened successfully");
        } else {
          logger.info("No eggs available");
        }
        return data;
      }
      logger.warn("Could not retrieve data from response");
      return null;
    } catch (error) {
      logger.error(
        "Error checking points and egg:",
        error.response?.status || error.message
      );
      return null;
    }
  }

  async openEgg() {
    try {
      const response = await retryRequest(() =>
        axios.post(
          `${this.baseUrl}${CONFIG.ENDPOINTS.EGG_OPEN}`,
          {},
          { headers: this.headers }
        )
      );
      logger.success(
        `Egg opened: ${colors.custom}${response.data.data.codeName}${colors.reset} - ${colors.info}${response.data.data.codeDesc}${colors.reset}`
      );
    } catch (error) {
      logger.error(
        "Error opening egg:",
        error.response?.status || error.message
      );
    }
  }

  async checkFriendsCount() {
    try {
      const response = await retryRequest(() =>
        axios.get(`${this.baseUrl}${CONFIG.ENDPOINTS.FRIENDS_COUNT}`, {
          headers: this.headers,
        })
      );

      if (response?.data?.data !== undefined) {
        logger.info(
          `Friends count: ${colors.success}${response.data.data}${colors.reset}`
        );
        return response.data.data;
      }
      return 0;
    } catch (error) {
      logger.error(
        "Error checking friends count:",
        error.response?.status || error.message
      );
      return 0;
    }
  }

  async dailyCheckin() {
    try {
      const checkStatus = await retryRequest(() =>
        axios.get(`${this.baseUrl}${CONFIG.ENDPOINTS.ATTENDANCE_CHECK}`, {
          headers: this.headers,
        })
      );

      if (checkStatus.data.data === true) {
        logger.info(`${colors.warning}Already checked in today${colors.reset}`);
        return;
      }

      const response = await retryRequest(() =>
        axios.post(
          `${this.baseUrl}${CONFIG.ENDPOINTS.ATTENDANCE_SUBMIT}`,
          {},
          { headers: this.headers }
        )
      );

      logger.success(
        `Daily check-in completed: ${colors.success}${response.data.data.point}${colors.reset} points earned`
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Error during daily check-in:",
        error.response?.status || error.message
      );
    }
  }

  async completeTasks() {
    try {
      const completedCount = await retryRequest(() =>
        axios.get(`${this.baseUrl}${CONFIG.ENDPOINTS.TASKS_COMPLETED_COUNT}`, {
          headers: this.headers,
        })
      );

      if (completedCount?.data?.data >= CONFIG.TOTAL_TASKS) {
        logger.info(
          `${colors.success}All daily tasks already completed${colors.reset}`
        );
        return;
      }

      const tasksResponse = await retryRequest(() =>
        axios.get(`${this.baseUrl}${CONFIG.ENDPOINTS.TASKS_LIST}`, {
          headers: this.headers,
        })
      );

      if (!tasksResponse?.data?.data) {
        logger.warn("No tasks data available");
        return;
      }

      const remainingTasks =
        CONFIG.TOTAL_TASKS - (completedCount?.data?.data || 0);
      logger.info(
        `${colors.info}${remainingTasks}${colors.reset} tasks remaining to complete`
      );

      for (const task of tasksResponse.data.data) {
        try {
          if (task.completeCount > 0) {
            logger.info(
              `Task ${colors.custom}${task.taskMainTitle}${colors.reset} - ${colors.warning}Already completed${colors.reset}`
            );
            continue;
          }

          await retryRequest(() =>
            axios.post(
              `${this.baseUrl}${CONFIG.ENDPOINTS.TASK_RUN}`,
              { taskIdx: task.taskIdx },
              { headers: this.headers }
            )
          );

          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.DELAYS.BETWEEN_ACTIONS)
          );

          const complete = await retryRequest(() =>
            axios.post(
              `${this.baseUrl}${CONFIG.ENDPOINTS.TASK_COMPLETE}`,
              { taskIdx: task.taskIdx },
              { headers: this.headers }
            )
          );

          if (complete?.data?.data?.point !== undefined) {
            logger.success(
              `Task completed: ${colors.custom}${task.taskMainTitle}${colors.reset} - ${colors.success}${complete.data.data.point}${colors.reset} points earned`
            );
          }

          await new Promise((resolve) =>
            setTimeout(
              resolve,
              Math.random() * CONFIG.DELAYS.BETWEEN_ACTIONS +
                CONFIG.DELAYS.BETWEEN_ACTIONS
            )
          );
        } catch (error) {
          logger.error(
            `Error completing task ${colors.custom}${task.taskMainTitle}${colors.reset}:`,
            error.response?.status || error.message
          );
          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.DELAYS.BETWEEN_ACTIONS * 2)
          );
        }
      }
    } catch (error) {
      logger.error(
        "Error getting tasks:",
        error.response?.status || error.message
      );
    }
  }

  async checkAndClaimSlPass() {
    try {
      const slPassList = await retryRequest(() =>
        axios.get(`${this.baseUrl}${CONFIG.ENDPOINTS.SL_PASS_LIST}`, {
          headers: this.headers,
        })
      );

      if (!slPassList?.data?.data) {
        logger.warn("No SL Pass data available");
        return;
      }

      logger.info(
        `${colors.brightCyan}=== Checking Free SL Pass Rewards ===${colors.reset}`
      );

      let hasUnclaimedRewards = false;
      const rewards = slPassList.data.data;

      for (const reward of rewards) {
        // Only process free SL Pass rewards
        if (!reward.slPassId.startsWith("free")) continue;

        const items = reward.getItems
          .map(
            (item) => `${colors.info}${item.count} ${item.item}${colors.reset}`
          )
          .join(", ");

        if (reward.isClaim) {
          logger.info(
            `Step ${colors.success}${reward.step}${colors.reset}: ${items} - ${colors.warning}Already claimed${colors.reset}`
          );
        } else {
          hasUnclaimedRewards = true;
          logger.info(
            `Step ${colors.success}${reward.step}${colors.reset}: ${items} - ${colors.brightGreen}Claiming...${colors.reset}`
          );

          const claimed = await this.claimSlPassReward(reward.slPassId);
          if (claimed) {
            logger.success(
              `Successfully claimed Step ${reward.step} free rewards`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, CONFIG.DELAYS.BETWEEN_ACTIONS)
            );
          } else {
            logger.error(`Failed to claim Step ${reward.step} free rewards`);
          }
        }
      }

      if (!hasUnclaimedRewards) {
        logger.info(
          `${colors.warning}All free rewards have been claimed${colors.reset}`
        );
      }
    } catch (error) {
      logger.error(
        "Error processing SL Pass rewards:",
        error.response?.status || error.message
      );
    }
  }

  async claimSlPassReward(slPassId) {
    try {
      const response = await retryRequest(() =>
        axios.post(
          `${this.baseUrl}${CONFIG.ENDPOINTS.SL_PASS_CLAIM}`,
          { slPassId },
          { headers: this.headers }
        )
      );
      return response?.data?.success || false;
    } catch (error) {
      logger.error(
        `Error claiming SL Pass reward:`,
        error.response?.status || error.message
      );
      return false;
    }
  }

  async playGames() {
    const friendsCount = await this.checkFriendsCount();
    logger.custom(
      `Game Status (Friends: ${colors.success}${friendsCount}${colors.reset})`
    );

    const availableLevels = CONFIG.GAMES.LEVELS.filter((level) => {
      if (level === "easy") return true;
      return friendsCount >= CONFIG.GAMES.REQUIREMENTS[level];
    });

    if (availableLevels.length < CONFIG.GAMES.LEVELS.length) {
      if (!availableLevels.includes("medium")) {
        logger.warn("Medium mode locked: Need 1 friend");
      }
      if (!availableLevels.includes("hard")) {
        logger.warn("Hard mode locked: Need 3 friends");
      }
    }

    for (const game of CONFIG.GAMES.NAMES) {
      try {
        const status = await retryRequest(() =>
          axios.get(
            `${this.baseUrl}${CONFIG.ENDPOINTS.GAME_STATUS}?gameCode=${game}`,
            {
              headers: this.headers,
            }
          )
        );

        const gameData = status.data.data;
        logger.custom(
          `${colors.brightCyan}${game} Game Available Plays:${colors.reset}`
        );

        for (const level of CONFIG.GAMES.LEVELS) {
          const levelData = gameData.find((d) => d.level === level);
          const remainingTimes = levelData.dailyTimes - levelData.times;
          const isLocked = !availableLevels.includes(level);

          logger.info(
            `- ${colors.custom}${level.toUpperCase()}${colors.reset}: ${
              colors.success
            }${remainingTimes}${colors.reset}/${
              levelData.dailyTimes
            } plays remaining` +
              (isLocked ? ` ${colors.error}(LOCKED)${colors.reset}` : "") +
              ` [${colors.info}${levelData.gamePoint}${colors.reset} points per play]`
          );
        }

        for (const level of availableLevels) {
          const levelData = gameData.find((d) => d.level === level);
          const remainingTimes = levelData.dailyTimes - levelData.times;

          if (remainingTimes > 0) {
            logger.info(
              `Playing ${colors.custom}${game} ${level}${colors.reset} mode (${colors.success}${remainingTimes}${colors.reset} plays remaining)...`
            );

            for (let i = 0; i < remainingTimes; i++) {
              try {
                const gameRun = await retryRequest(() =>
                  axios.post(
                    `${this.baseUrl}${CONFIG.ENDPOINTS.GAME_RUN}`,
                    { gameId: game, level: level, logStatus: "S" },
                    { headers: this.headers }
                  )
                );

                await new Promise((resolve) =>
                  setTimeout(resolve, CONFIG.DELAYS.BETWEEN_ACTIONS)
                );

                const complete = await retryRequest(() =>
                  axios.post(
                    `${this.baseUrl}${CONFIG.ENDPOINTS.GAME_COMPLETE}`,
                    {
                      gameId: game,
                      level: level,
                      runIdx: gameRun.data.data.toString(),
                    },
                    { headers: this.headers }
                  )
                );

                logger.success(
                  `✓ ${colors.custom}${game} ${level}${colors.reset} play ${
                    colors.info
                  }${i + 1}/${remainingTimes}${colors.reset}: ${
                    colors.success
                  }${complete.data.data.point}${colors.reset} points earned`
                );

                await new Promise((resolve) =>
                  setTimeout(
                    resolve,
                    Math.random() * CONFIG.DELAYS.BETWEEN_ACTIONS +
                      CONFIG.DELAYS.BETWEEN_ACTIONS
                  )
                );
              } catch (error) {
                logger.error(
                  `Error playing ${colors.custom}${game} ${level}${colors.reset}:`,
                  error.response?.status || error.message
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error(
          `Error getting ${colors.custom}${game}${colors.reset} status:`,
          error.response?.status || error.message
        );
      }
    }
    logger.custom("Finished playing all available games");
  }
}

async function processAccount(bot) {
  await bot.checkMyPointAndEgg();
  await bot.dailyCheckin();
  await bot.completeTasks();
  await bot.checkAndClaimSlPass();
  await bot.playGames();
  await bot.checkMyPointAndEgg();
}

async function runAllAccounts() {
  const tokens = fs
    .readFileSync("data.txt", "utf8")
    .split("\n")
    .filter((token) => token.trim());

  logger.info(
    `Found ${colors.success}${tokens.length}${colors.reset} account(s) to process`
  );

  for (const token of tokens) {
    logger.custom(
      `Processing account with token: ${colors.info}${token.substring(
        0,
        20
      )}...${colors.reset}`
    );

    const bot = new PrompTaleAutomation(token.trim());
    await processAccount(bot);

    if (tokens.indexOf(token) < tokens.length - 1) {
      logger.info("Waiting before processing next account...");
      await CountdownTimer.countdown(CONFIG.DELAYS.BETWEEN_ACCOUNTS, {
        message: "Next account in: ",
        format: "ss",
      });
    }
  }
  logger.success("All accounts processed for this cycle!");
}

async function startMainLoop() {
  while (true) {
    try {
      displayBanner();
      await runAllAccounts();

      logger.info(`${colors.warning}Waiting for next cycle...${colors.reset}`);
      await CountdownTimer.countdown(CONFIG.DELAYS.NEXT_CYCLE, {
        message: "Next cycle in: ",
        format: "HH:mm:ss",
      });
    } catch (error) {
      logger.error("Cycle error:", error.message);
      // Wait 5 minutes before retrying on error
      await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
    }
  }
}

// Start the continuous loop
startMainLoop().catch((error) => {
  logger.error("Fatal error:", error.message);
  process.exit(1);
});
