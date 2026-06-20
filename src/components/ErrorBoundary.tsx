import { Component, type ReactNode } from 'react'
import { Alert, Stack, Text } from '@mantine/core'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <Stack p="xl">
          <Alert color="red" title="Unexpected error">
            <Text>{this.state.error.message}</Text>
          </Alert>
        </Stack>
      )
    }
    return this.props.children
  }
}
