import type { Meta, StoryObj } from '@storybook/react'
import { ProgressReport } from './ProgressReport'
import { createInitialState } from '../domain/learningEngine'

const meta: Meta<typeof ProgressReport> = {
  title: 'Reports/ProgressReport',
  component: ProgressReport,
}

export default meta

type Story = StoryObj<typeof ProgressReport>

export const Default: Story = {
  args: {
    state: createInitialState('Calculus 1'),
    onClose: () => undefined,
  },
}
