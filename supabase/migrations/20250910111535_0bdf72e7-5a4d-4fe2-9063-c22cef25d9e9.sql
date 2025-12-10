-- Give admin user the admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('2af86acf-8d8c-44a1-91d7-edd59f37b209', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;