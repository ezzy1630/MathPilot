import type { Meta, StoryObj } from '@storybook/react'
import { MasteryBadge } from './MasteryBadge'

const meta: Meta<typeof MasteryBadge> = {
  title: 'UI/MasteryBadge',
  component: MasteryBadge,
  args: { state: 'Learning' },
}

export default meta
type Story = StoryObj<typeof MasteryBadge>

export const Learning: Story = {}
export const WeakPulse: Story = { args: { state: 'Weak', pulse: true } }
export const Mastered: Story = { args: { state: 'Mastered' } }
export const NeedsReview: Story = { args: { state: 'Needs Review' } }
