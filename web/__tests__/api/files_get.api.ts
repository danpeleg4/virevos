import { GET } from '@/app/api/files/[id]/get-files/route'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@db/db'
import { NextRequest } from 'next/server'

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}))

jest.mock('@db/db', () => ({
    db: {
        select: jest.fn(),
    },
}))

describe('GET /api/project-files/project/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    function mockCtx(id: string) {
        return {
            params: Promise.resolve({ id }),
        }
    }

    it('returns 401 if user is not authenticated', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue(null)

        const res = await GET({} as NextRequest, mockCtx('1'))

        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 if projectId is invalid', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        const res = await GET({} as NextRequest, mockCtx('abc'))

        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'Invalid projectId' })
    })

    it('returns files for a valid projectId', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        const mockFiles = [
                { id: 1, projectId: 10, name: 'file1.pdf' },
                { id: 2, projectId: 10, name: 'file2.pdf' },
            ]

        ;(db.select as jest.Mock).mockReturnValue({
            from: () => ({
                where: () => Promise.resolve(mockFiles),
            }),
        })

        const res = await GET({} as NextRequest, mockCtx('10'))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual(mockFiles)
    })
})
