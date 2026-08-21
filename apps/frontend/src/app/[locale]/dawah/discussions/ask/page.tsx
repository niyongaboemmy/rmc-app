import { AskQuestionForm } from '@/components/dawah/AskQuestionForm';

// Auth state is client-side (useAuth), so the form itself gates; no server guard needed.
export default function AskPage() {
  return <AskQuestionForm />;
}
