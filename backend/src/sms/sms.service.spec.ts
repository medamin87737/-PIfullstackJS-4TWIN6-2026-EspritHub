import { ConfigService } from '@nestjs/config'
import { SmsService } from './sms.service'

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('SmsService', () => {
  const createConfig = (values: Record<string, string | undefined>) =>
    ({
      get: (key: string) => values[key],
    }) as unknown as ConfigService

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('normalizes tunisian local and international numbers', async () => {
    const service = new SmsService(
      createConfig({
        TWILIO_ACCOUNT_SID: 'AC12345678901',
        TWILIO_AUTH_TOKEN: 'token-token-token',
        TWILIO_PHONE_NUMBER: '+21611111111',
      }),
    )

    const normalize = (service as any).normalizePhone.bind(service) as (raw: string) => string | null
    expect(normalize('20123456')).toBe('+21620123456')
    expect(normalize('+21620123456')).toBe('+21620123456')
    expect(normalize('0021620123456')).toBe('+21620123456')
    expect(normalize('bad-phone')).toBeNull()
  })

  it('skips sending when phone number is invalid', async () => {
    const create = jest.fn()
    const service = new SmsService(
      createConfig({
        TWILIO_ACCOUNT_SID: 'AC12345678901',
        TWILIO_AUTH_TOKEN: 'token-token-token',
        TWILIO_PHONE_NUMBER: '+21611111111',
      }),
    )
    ;(service as any).client = { messages: { create } }

    await service.sendRecommendationReminder({
      to: 'invalid',
      employeeName: 'Amin',
      activityTitle: 'Activity',
      activityDate: new Date('2026-01-01'),
    })

    expect(create).not.toHaveBeenCalled()
  })

  it('sends sms when client and phone are valid', async () => {
    const create = jest.fn().mockResolvedValue({ sid: 'SM123' })
    const service = new SmsService(
      createConfig({
        TWILIO_ACCOUNT_SID: 'AC12345678901',
        TWILIO_AUTH_TOKEN: 'token-token-token',
        TWILIO_PHONE_NUMBER: '+21611111111',
      }),
    )
    ;(service as any).client = { messages: { create } }

    await service.sendRecommendationReminder({
      to: '20123456',
      employeeName: 'Amin',
      activityTitle: 'Formation RH',
      activityDate: new Date('2026-01-01'),
      deadlineDays: 5,
      frontendUrl: 'http://localhost:5173',
    })

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].to).toBe('+21620123456')
  })
})

