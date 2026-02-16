import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with some sample text.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const TaskCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Visit Maria da Silva</CardTitle>
          <Badge variant="warning">Medium</Badge>
        </div>
        <CardDescription>Church: Central Chapel</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Schedule a pastoral visit to check on the family.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge variant="outline">Pending</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button size="sm">Complete</Button>
        </div>
      </CardFooter>
    </Card>
  ),
};

export const PrayerCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">João Pedro</CardTitle>
          <Badge variant="success">Answered</Badge>
        </div>
        <CardDescription>Community Church</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700">
            Praying for healing and restoration.
          </p>
        </div>
      </CardContent>
    </Card>
  ),
};
