import { POST } from '@/app/api/recording/route'
import { currentUser } from '@clerk/nextjs/server'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Mocks
jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}))

jest.mock('@aws-sdk/client-s3', () => {
    const send = jest.fn()

    return {
        __esModule: true,
        S3Client: jest.fn(() => ({
            send,
        })),
        ListObjectsV2Command: jest.fn(),
        GetObjectCommand: jest.fn(),
        __sendMock: send,
    }
})

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}))

// Helpers
function makeRequest(body: unknown) {
    return new Request('http://localhost/api/recordings', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

function getSendMock(): jest.Mock {
    return (
        jest.requireMock('@aws-sdk/client-s3') as {
            __sendMock: jest.Mock
        }
    ).__sendMock
}

// Tests
describe('POST /api/recordings', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 401 when unauthenticated', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue(null)

        const res = await POST(makeRequest({ meetingId: 'm1' }) as never)

        expect(res.status).toBe(401)
        expect(await res.text()).toBe('Unauthorized')
    })

    it('returns 400 when meetingId is missing', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        const res = await POST(makeRequest({}) as never)

        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'Meeting ID required' })
    })

    it('returns 404 when no files found', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        getSendMock().mockResolvedValue({ Contents: [] })

        const res = await POST(makeRequest({ meetingId: 'm1' }) as never)

        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'No files found' })
    })

    it('returns 404 when no video files found', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        getSendMock().mockResolvedValue({
            Contents: [{ Key: 'recordings/user_1/m1/file.txt' }],
        })

        const res = await POST(makeRequest({ meetingId: 'm1' }) as never)

        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'No video files found' })
    })

    it('returns signed video URLs', async () => {
        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })

        getSendMock().mockResolvedValue({
            Contents: [
                { Key: 'recordings/user_1/m1/video1.mp4' },
                { Key: 'recordings/user_1/m1/video2.mp4' },
            ],
        })

        ;(getSignedUrl as jest.Mock)
            .mockResolvedValueOnce('https://signed-url-1')
            .mockResolvedValueOnce('https://signed-url-2')

        const res = await POST(makeRequest({ meetingId: 'm1' }) as never)

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({
            videoUrls: [
                {
                    key: 'recordings/user_1/m1/video1.mp4',
                    url: 'https://signed-url-1',
                },
                {
                    key: 'recordings/user_1/m1/video2.mp4',
                    url: 'https://signed-url-2',
                },
            ],
        })
    })

    it('returns 500 on s3 error', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

        ;(currentUser as jest.Mock).mockResolvedValue({ id: 'user_1' })
        getSendMock().mockRejectedValue(new Error('S3 failure'))

        const res = await POST(makeRequest({ meetingId: 'm1' }) as never)

        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({ error: 'Failed to fetch files' })

        spy.mockRestore()
    })
})
