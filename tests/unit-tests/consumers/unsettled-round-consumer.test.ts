import UnsettledRoundConsumer from "../../../src/consumers/unsettled-round-consumer";

type MockCron = { scheduleEvent: jest.Mock; start: jest.Mock; schedule: jest.Mock };

function makeCradle(overrides: Record<string, unknown> = {}) {
	return {
		// Base consumer deps
		gameData: {},
		definition: {},
		betsRepository: { find: jest.fn() },
		betLogsRepository: {},
		tempBetsRepository: undefined,
		settleGameRoundConsumer: { settleRound: jest.fn() },
		roundResultConsumer: { generateResult: jest.fn() },
		provablyFairConsumer: {
			updateClientSeedsFromBets: jest.fn(),
			setServerSeed: jest.fn(),
			setServerSeedHash: jest.fn(),
		},
		gameManagementApiClientFactory: { instance: jest.fn().mockReturnValue({ gameConfigs: {} }) },
		// Our subclass dep
		oddsFeedCron: { scheduleEvent: jest.fn(), start: jest.fn(), schedule: jest.fn() },
		...overrides,
	};
}

describe("UnsettledRoundConsumer", () => {
	describe("proceed", () => {
		let oddsFeedCron: MockCron;

		beforeEach(() => {
			jest.clearAllMocks();

			// Arrange
			oddsFeedCron = { scheduleEvent: jest.fn(), start: jest.fn(), schedule: jest.fn() };
		});

		it("should not get bot bets if no temp bets repository", async () => {
			// Arrange
			const playerExec = jest.fn().mockResolvedValue([
				{ roundId: 10, paid: false },
				{ roundId: 11, paid: false },
				{ roundId: 10, paid: false },
			]);
			const playerLean = jest.fn().mockReturnValue({ exec: playerExec });
			const playerFind = jest.fn().mockReturnValue({ lean: playerLean });
			const consumer = new UnsettledRoundConsumer(
				makeCradle({ betsRepository: { find: playerFind }, oddsFeedCron })
			);

			// Act
			await consumer.proceed();

			// Assert
			expect(playerFind).toHaveBeenCalledWith({ paid: false });
			expect(playerLean).toHaveBeenCalledTimes(1);
			expect(playerExec).toHaveBeenCalledTimes(1);
			const scheduledEventIds = oddsFeedCron.scheduleEvent
				.mock.calls.map(([arg]: [{ eventID: number }]) => arg.eventID)
				.sort((a: number, b: number) => a - b);
			expect(scheduledEventIds).toEqual([10, 11]);
		});

		it("should concat player bets and bot bets and call schedule event on unique round ids", async () => {
			// Arrange
			const playerExec = jest.fn().mockResolvedValue([
				{ roundId: 1, paid: false },
				{ roundId: 2, paid: false },
				{ roundId: 2, paid: false },
			]);
			const playerLean = jest.fn().mockReturnValue({ exec: playerExec });
			const playerFind = jest.fn().mockReturnValue({ lean: playerLean });

			const botExec = jest.fn().mockResolvedValue([
				{ roundId: 2, paid: false },
				{ roundId: 3, paid: false },
			]);
			const botLean = jest.fn().mockReturnValue({ exec: botExec });
			const botFind = jest.fn().mockReturnValue({ lean: botLean });

			const consumer = new UnsettledRoundConsumer(
				makeCradle({
					betsRepository: { find: playerFind },
					tempBetsRepository: { find: botFind },
					oddsFeedCron,
				})
			);

			// Act
			await consumer.proceed();

			// Assert
			expect(playerFind).toHaveBeenCalledWith({ paid: false });
			expect(botFind).toHaveBeenCalledWith({ paid: false });

			const scheduledEventIds = oddsFeedCron.scheduleEvent
				.mock.calls.map(([arg]: [{ eventID: number }]) => arg.eventID)
				.sort((a: number, b: number) => a - b);
			expect(scheduledEventIds).toEqual([1, 2, 3]);
		});
	});
});