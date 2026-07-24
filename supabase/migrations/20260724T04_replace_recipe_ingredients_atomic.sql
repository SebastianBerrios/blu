CREATE OR REPLACE FUNCTION public.replace_recipe_ingredients(p_recipe_id bigint, p_ingredients jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  DELETE FROM public.recipe_ingredients WHERE recipe_id = p_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, recipe_ingredients_id, quantity, unit_of_measure)
  SELECT p_recipe_id, (e->>'recipe_ingredients_id')::bigint, (e->>'quantity')::real, e->>'unit_of_measure'
  FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) e;
END; $$;
REVOKE EXECUTE ON FUNCTION public.replace_recipe_ingredients(bigint, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.replace_recipe_ingredients(bigint, jsonb) TO authenticated;
