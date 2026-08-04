-- ============================================================================
-- Starter seed — a sample of FBS teams so you can test the app immediately.
-- For the full ~134-team FBS list with live logos/conferences, run
-- `npm run seed:teams` instead (pulls from the CollegeFootballData API —
-- see scripts/seed-teams.ts and README "Populating real team data").
-- ============================================================================

insert into cfb_teams (school, mascot, conference, logo_url, ap_rank) values
  ('Georgia', 'Bulldogs', 'SEC', null, 1),
  ('Ohio State', 'Buckeyes', 'Big Ten', null, 2),
  ('Texas', 'Longhorns', 'SEC', null, 3),
  ('Alabama', 'Crimson Tide', 'SEC', null, 4),
  ('Oregon', 'Ducks', 'Big Ten', null, 5),
  ('Penn State', 'Nittany Lions', 'Big Ten', null, 6),
  ('Notre Dame', 'Fighting Irish', 'Independent', null, 7),
  ('Michigan', 'Wolverines', 'Big Ten', null, 8),
  ('Clemson', 'Tigers', 'ACC', null, 9),
  ('LSU', 'Tigers', 'SEC', null, 10),
  ('Tennessee', 'Volunteers', 'SEC', null, null),
  ('Ole Miss', 'Rebels', 'SEC', null, null),
  ('Oklahoma', 'Sooners', 'SEC', null, null),
  ('Florida State', 'Seminoles', 'ACC', null, null),
  ('Miami', 'Hurricanes', 'ACC', null, null),
  ('USC', 'Trojans', 'Big Ten', null, null),
  ('Utah', 'Utes', 'Big 12', null, null),
  ('Kansas State', 'Wildcats', 'Big 12', null, null),
  ('Iowa', 'Hawkeyes', 'Big Ten', null, null),
  ('Wisconsin', 'Badgers', 'Big Ten', null, null),
  ('Boise State', 'Broncos', 'Mountain West', null, null),
  ('Army', 'Black Knights', 'American', null, null),
  ('Memphis', 'Tigers', 'American', null, null),
  ('Arizona State', 'Sun Devils', 'Big 12', null, null),
  ('SMU', 'Mustangs', 'ACC', null, null)
on conflict (school) do nothing;
