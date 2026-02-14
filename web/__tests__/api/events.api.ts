import { GET } from '@/app/api/events/route'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@db/db'
import { events } from '@db/schema'
import { eq } from 'drizzle-orm'

// Mocks
jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}))

jest.mock('@db/db', () => ({
    db: {
        query: {
            events: {
                findMany: jest.fn(),
            },
        },
    },
}))

// Tests
describe('GET /api/events', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 401 if user is not authenticated', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue(null)

        const res = await GET()

        expect(res.status).toBe(401)
        expect(await res.text()).toBe('Unauthorized')
    })

    it('returns events for authenticated user', async () => {
        const mockUser = { id: 'user_123' }

        const mockEvents = [
                {
                    id: 'event_1',
                    title: 'Meeting',
                    attendees: [{ id: 'a1', email: 'test@example.com' }],
                },
            ]

        ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
        ;(db.query.events.findMany as jest.Mock).mockResolvedValue(mockEvents)

        const res = await GET()
        const json = await res.json()

        // Response
        expect(res.status).toBe(200)
        expect(json).toEqual(mockEvents)

        // DB call
        expect(db.query.events.findMany).toHaveBeenCalledWith({
            where: eq(events.userId, mockUser.id),
            with: {
                attendees: true,
            },
        })
    })
})
