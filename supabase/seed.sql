-- Local dev accounts, mirroring the four users that existed in Firebase Auth.
--
-- Runs automatically on `npx supabase db reset`. Local development only —
-- this file is never applied to a hosted project.
--
-- Each account gets the password 'devpassword123' so it can be used before
-- Google OAuth credentials are configured in config.toml. When Google is
-- enabled later, signing in with the same address attaches a google identity
-- to the account that already owns that email.

do $$
declare
  emails text[] := array[
    'eitanbaron2023@gmail.com',
    'eix2012@gmail.com',
    'eitan2006@gmail.com',
    'eitan2007@gmail.com'
  ];
  addr text;
  new_id uuid;
begin
  foreach addr in array emails loop
    if exists (select 1 from auth.users where email = addr) then
      continue;
    end if;

    new_id := gen_random_uuid();

    -- The token columns must be '' rather than NULL: GoTrue scans them into
    -- non-nullable Go strings and a NULL surfaces as the opaque runtime error
    -- "Database error querying schema" on every sign-in attempt.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      addr, crypt('devpassword123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('email', addr, 'email_verified', true),
      '', '',
      '', '', '',
      '', '', ''
    );

    -- GoTrue requires a matching identity row for the account to be usable.
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(), new_id, new_id::text, 'email',
      jsonb_build_object('sub', new_id::text, 'email', addr, 'email_verified', true),
      now(), now(), now()
    );
  end loop;
end
$$;
