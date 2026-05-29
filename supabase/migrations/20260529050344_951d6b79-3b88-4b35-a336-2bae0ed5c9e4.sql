GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_payments(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_dashboard_path() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.miprojet_dashboard_stats() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.miprojet_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  tx_total integer;
  tx_paye integer;
  tx_attente integer;
  sub_miprojet_total integer;
  sub_miprojet_mois integer;
  sub_mutuelle_total integer;
  sub_mutuelle_mois integer;
  sub_paid_count integer;
  droits_adhesion_miprojet integer;
  cotisations_miprojet integer;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(SUM(montant), 0)::integer INTO tx_total FROM public.transactions_miprojet;
  SELECT COALESCE(SUM(montant), 0)::integer INTO tx_paye FROM public.transactions_miprojet WHERE statut IN ('vire','paye','valide','confirme');
  SELECT COALESCE(SUM(montant), 0)::integer INTO tx_attente FROM public.transactions_miprojet WHERE statut IN ('en_attente','attente','pending');

  SELECT COALESCE(SUM(part_miprojet), 0)::integer, COUNT(*)::integer
    INTO sub_miprojet_total, sub_paid_count
  FROM public.subscriptions
  WHERE statut_paiement IN ('paye','confirme','valide');

  SELECT COALESCE(SUM(part_miprojet), 0)::integer INTO sub_miprojet_mois
  FROM public.subscriptions
  WHERE statut_paiement IN ('paye','confirme','valide') AND COALESCE(paid_at, created_at) >= date_trunc('month', now());

  SELECT COALESCE(SUM(part_mutuelle), 0)::integer INTO sub_mutuelle_total
  FROM public.subscriptions
  WHERE statut_paiement IN ('paye','confirme','valide');

  SELECT COALESCE(SUM(part_mutuelle), 0)::integer INTO sub_mutuelle_mois
  FROM public.subscriptions
  WHERE statut_paiement IN ('paye','confirme','valide') AND COALESCE(paid_at, created_at) >= date_trunc('month', now());

  SELECT COALESCE(SUM(part_miprojet), 0)::integer INTO droits_adhesion_miprojet
  FROM public.subscriptions
  WHERE type = 'inscription' AND statut_paiement IN ('paye','confirme','valide');

  SELECT COALESCE(SUM(part_miprojet), 0)::integer INTO cotisations_miprojet
  FROM public.subscriptions
  WHERE type = 'cotisation' AND statut_paiement IN ('paye','confirme','valide');

  SELECT jsonb_build_object(
    'transactions_total', GREATEST(tx_total, sub_miprojet_total),
    'transactions_paye', GREATEST(tx_paye, sub_miprojet_total),
    'transactions_attente', tx_attente,
    'parts_miprojet_total', sub_miprojet_total,
    'parts_miprojet_mois', sub_miprojet_mois,
    'parts_mutuelle_total', sub_mutuelle_total,
    'parts_mutuelle_mois', sub_mutuelle_mois,
    'droits_adhesion_miprojet', droits_adhesion_miprojet,
    'cotisations_miprojet', cotisations_miprojet,
    'sessions_paiement', GREATEST((SELECT COUNT(*) FROM public.payment_sessions WHERE statut IN ('paye','confirme','valide')), sub_paid_count),
    'subscriptions_payees', sub_paid_count,
    'members_total', (SELECT COUNT(*) FROM public.members),
    'cotisations_total', (SELECT COALESCE(SUM(montant_total), 0) FROM public.subscriptions WHERE type = 'cotisation' AND statut_paiement IN ('paye','confirme','valide'))
  ) INTO result;

  RETURN result;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_members_created_at_desc ON public.members (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_search_lower ON public.members (lower(nom), lower(prenoms), lower(telephone), lower(matricule));
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_created_desc ON public.subscriptions (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paid_type_date ON public.subscriptions (statut_paiement, type, COALESCE(paid_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paid_date ON public.subscriptions (statut_paiement, COALESCE(paid_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status_date ON public.payment_sessions (statut, COALESCE(confirmed_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_miprojet_created_desc ON public.transactions_miprojet (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_miprojet_status_created ON public.transactions_miprojet (statut, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prestation_requests_status_date ON public.prestation_requests (statut_global, COALESCE(closed_at, updated_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_desc ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_public_created ON public.forum_topics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_messages_created_desc ON public.forum_messages (created_at DESC);