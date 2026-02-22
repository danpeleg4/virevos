import { POST } from '@/app/api/chat/route'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@db/db'
import { NextRequest } from 'next/server'
import { createAgentUIStreamResponse, UIMessage } from 'ai'
import { agent } from '@/lib/ai_tools'

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}))

jest.mock('@db/db', () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
    },
}))

jest.mock('ai', () => ({
    createAgentUIStreamResponse: jest.fn(),
    convertToModelMessages: jest.fn().mockResolvedValue([]),
    stepCountIs: jest.fn(),
    tool: jest.fn((t) => t),
}))

jest.mock('@/lib/ai_tools', () => ({
    agent: {},
}))

jest.mock('@/lib/server_actions/clients', () => ({
    addAClient: jest.fn(),
}))

jest.mock('@/lib/server_actions/meetings', () => ({
    getPastMeetingTranscript: jest.fn(),
}))

describe('POST /api/chat', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    function mockRequest(body: { messages: UIMessage[] }) {
        return {
            json: jest.fn().mockResolvedValue(body),
        } as unknown as NextRequest
    }

    it('returns 401 if user is not authenticated', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue(null)

        const res = await POST(mockRequest({ messages: [] }))

        expect(res.status).toBe(401)
        expect(await res.text()).toBe('Unauthorized')
    })

    it('returns 401 if user has no AI credits', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        ;(db.select as jest.Mock).mockReturnValue({
            from: () => ({
                where: () => Promise.resolve([{ ai_credits: 0 }]),
            }),
        })

        const res = await POST(mockRequest({ messages: [] }))

        expect(res.status).toBe(401)
        expect(await res.json()).toBe('No AI Credits')
    })

    it('decrements AI credits and calls createAgentUIStreamResponse', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        ;(db.select as jest.Mock).mockReturnValue({
            from: () => ({
                where: () => Promise.resolve([{ ai_credits: 2 }]),
            }),
        })

        const updateWhere = jest.fn()
        const updateSet = jest.fn(() => ({ where: updateWhere }))

        ;(db.update as jest.Mock).mockReturnValue({
            set: updateSet,
        })

        const mockStreamResponse = new Response('ok', { status: 200 })

        ;(createAgentUIStreamResponse as jest.Mock).mockReturnValue(mockStreamResponse)

        const res = await POST(mockRequest({ messages: [] }))

        expect(db.update).toHaveBeenCalled()
        expect(createAgentUIStreamResponse).toHaveBeenCalledWith({
            agent: agent,
            uiMessages: [],
        })

        expect(res.status).toBe(200)
    })
})
