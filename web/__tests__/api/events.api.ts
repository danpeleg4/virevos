import { GET } from '@/app/api/events/route'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@db/db'
import { getFreshGoogleAccessToken } from '@/lib/google_access'

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}))

jest.mock('@/lib/google_access', () => ({
    getFreshGoogleAccessToken: jest.fn(),
}))

const listMock = jest.fn()

jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn(() => ({
                setCredentials: jest.fn(),
            })),
        },
        calendar: jest.fn(() => ({
            events: {
                list: listMock,
            },
        })),
    },
}))

jest.mock('@db/db', () => ({
    db: {
        select: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
        query: {
            events: {
                findMany: jest.fn(),
            },
        },
    },
}))

describe('GET /api/events (Google sync)', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 401 if user is not authenticated', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue(null)

        const res = await GET()

        expect(res.status).toBe(401)
        expect(await res.text()).toBe('Unauthorized')
    })

    it('returns DB events if no google token exists', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })
        ;(getFreshGoogleAccessToken as jest.Mock).mockResolvedValue(null)

        ;(db.query.events.findMany as jest.Mock).mockResolvedValue([])

        const res = await GET()

        expect(db.query.events.findMany).toHaveBeenCalled()
        expect(await res.json()).toEqual([])
    })

    it('syncs google events and returns DB events', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })
        ;(getFreshGoogleAccessToken as jest.Mock).mockResolvedValue('access_token')

        listMock.mockResolvedValue({
            data: {
                items: [
                    {
                        id: 'google-1',
                        summary: 'Daily Standup',
                        description: 'Team sync',
                        start: { dateTime: new Date().toISOString() },
                        end: { dateTime: new Date(Date.now() + 30 * 60000).toISOString() },
                        status: 'confirmed',
                        hangoutLink: 'https://meet.google.com/abc',
                    },
                ],
            },
        })

        ;(db.select as jest.Mock).mockReturnValue({
            from: () => ({
                where: () => Promise.resolve([]),
            }),
        })

        ;(db.insert as jest.Mock).mockReturnValue({
            values: jest.fn(),
        })

        ;(db.query.events.findMany as jest.Mock).mockResolvedValue([
            { id: 'google-1', title: 'Daily Standup' },
        ])

        const res = await GET()

        expect(listMock).toHaveBeenCalled()
        expect(db.insert).toHaveBeenCalled()
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual([
            { id: 'google-1', title: 'Daily Standup' },
        ])
    })

    it('deletes removed google events that existed today', async () => {
        const today = new Date()

        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })
        ;(getFreshGoogleAccessToken as jest.Mock).mockResolvedValue('token')

        listMock.mockResolvedValue({
            data: { items: [] },
        })

        ;(db.select as jest.Mock).mockReturnValue({
            from: () => ({
                where: () =>
                    Promise.resolve([
                        {
                            id: 'old-google',
                            googleEventId: 'old-google',
                            origin: 'google_calendar',
                            dateTime: today,
                        },
                    ]),
            }),
        })

        const whereMock = jest.fn()
        ;(db.delete as jest.Mock).mockReturnValue({ where: whereMock })

        ;(db.query.events.findMany as jest.Mock).mockResolvedValue([])

        await GET()

        expect(db.delete).toHaveBeenCalled()
        expect(whereMock).toHaveBeenCalled()
    })
})
