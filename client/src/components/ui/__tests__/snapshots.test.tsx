/**
 * @fileoverview Snapshot tests para componentes UI
 * @module client/src/components/ui/__tests__/snapshots.test
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '../button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Badge } from '../badge';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { Skeleton } from '../skeleton';

describe('Snapshot Tests - Componentes UI', () => {
  describe('Button', () => {
    it('deve renderizar variante default corretamente', () => {
      const { container } = render(<Button>Click me</Button>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar variante destructive', () => {
      const { container } = render(<Button variant="destructive">Delete</Button>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar variante outline', () => {
      const { container } = render(<Button variant="outline">Outline</Button>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar variante ghost', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar tamanhos diferentes', () => {
      const { container } = render(
        <div>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🎯</Button>
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar estado disabled', () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Card', () => {
    it('deve renderizar card completo', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>
      );
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar card simples', () => {
      const { container } = render(
        <Card>
          <CardContent>
            <p>Simple card content</p>
          </CardContent>
        </Card>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Badge', () => {
    it('deve renderizar variante default', () => {
      const { container } = render(<Badge>Default</Badge>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar variante secondary', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar variante destructive', () => {
      const { container } = render(<Badge variant="destructive">Error</Badge>);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar variante outline', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Alert', () => {
    it('deve renderizar alert default', () => {
      const { container } = render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>Alert description message</AlertDescription>
        </Alert>
      );
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar alert destructive', () => {
      const { container } = render(
        <Alert variant="destructive">
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Skeleton', () => {
    it('deve renderizar skeleton básico', () => {
      const { container } = render(<Skeleton className="h-4 w-[250px]" />);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar skeleton de avatar', () => {
      const { container } = render(<Skeleton className="h-12 w-12 rounded-full" />);
      expect(container).toMatchSnapshot();
    });

    it('deve renderizar múltiplos skeletons', () => {
      const { container } = render(
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });
});
