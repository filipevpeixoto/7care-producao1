import { Clock, Send, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface InviteSummaryCardsProps {
  pendingCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export function InviteSummaryCards({
  pendingCount,
  submittedCount,
  approvedCount,
  rejectedCount,
}: InviteSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-3 text-center">
          <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-900">{pendingCount}</p>
          <p className="text-xs text-yellow-700">Aguardando</p>
        </CardContent>
      </Card>
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 text-center">
          <Send className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-900">{submittedCount}</p>
          <p className="text-xs text-blue-700">Para Revisar</p>
        </CardContent>
      </Card>
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-3 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-900">{approvedCount}</p>
          <p className="text-xs text-green-700">Aprovados</p>
        </CardContent>
      </Card>
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-3 text-center">
          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-900">{rejectedCount}</p>
          <p className="text-xs text-red-700">Rejeitados</p>
        </CardContent>
      </Card>
    </div>
  );
}
