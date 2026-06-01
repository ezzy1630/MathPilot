import type { Meta, StoryObj } from '@storybook/react'
import { SignChart } from './SignChart'

const meta: Meta<typeof SignChart> = {
  title: 'Components/SignChart',
  component: SignChart,
}

export default meta
type Story = StoryObj<typeof SignChart>

export const Extrema: Story = {
  args: {
    intervals: [
      { range: '(-∞, 1)', sign: '+' },
      { range: '(1, 3)', sign: '-' },
      { range: '(3, ∞)', sign: '+' },
    ],
    testPoint: 'x = 2 → f′(2) < 0',
  },
}
