ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS purchase_number bigint;
UPDATE public.purchases SET purchase_number = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM public.purchases) sub
WHERE public.purchases.id = sub.id AND public.purchases.purchase_number IS NULL;
DO $$ DECLARE v_max bigint; BEGIN
  SELECT COALESCE(MAX(purchase_number), 0) INTO v_max FROM public.purchases;
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.purchases_purchase_number_seq START WITH %s', v_max + 1);
END $$;
ALTER TABLE public.purchases
  ALTER COLUMN purchase_number SET DEFAULT nextval('public.purchases_purchase_number_seq'),
  ALTER COLUMN purchase_number SET NOT NULL;
CREATE OR REPLACE FUNCTION public.fn_purchases_set_purchase_number() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN IF NEW.purchase_number IS NULL THEN NEW.purchase_number := nextval('public.purchases_purchase_number_seq'); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_purchases_purchase_number ON public.purchases;
CREATE TRIGGER trg_purchases_purchase_number BEFORE INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.fn_purchases_set_purchase_number();
