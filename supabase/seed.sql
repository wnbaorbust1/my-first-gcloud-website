-- Local-dev-only demo curriculum content. Applied by `supabase db reset`
-- (or `supabase db push --include-seed`) AFTER migrations — never as part
-- of a migration itself, since this is illustrative sample content, not
-- real reference data that belongs in every environment.
--
-- Gives the curriculum browser something real to show locally: one
-- Algebra I unit with 3 weeks, a fully worked published lesson, a draft
-- lesson, a published assignment + draft assignment, and a published
-- assessment + its linked retake variant — enough to demonstrate the
-- publish gate / RLS visibility split and the assessment variant
-- relationship without a real Supabase project.
--
-- Note the insert order below is not arbitrary: a lesson must exist
-- before its segments can reference it, and it can only move to
-- status = 'published' once all 6 segments + required fields are present
-- (see check_lesson_publishable() in the lessons migration) — so every
-- lesson here is created as a draft, filled in, then published last.

do $$
declare
  algebra_course_id uuid;
  unit1_id uuid;
  week1_id uuid;
  week2_id uuid;
  week3_id uuid;
  lesson1_id uuid;
  unit1_test_id uuid;
  teks_linear_id uuid;
  teks_quadratic_id uuid;
begin
  select id into algebra_course_id from public.courses where slug = 'algebra-1';
  select id into teks_linear_id from public.teks where code = '111.39(c)(6)(A)';
  select id into teks_quadratic_id from public.teks where code = '111.39(c)(10)(A)';

  insert into public.units (course_id, unit_number, title, teks_focus_summary)
  values (algebra_course_id, 1, 'Linear Functions', 'Writing and graphing linear functions in multiple forms.')
  returning id into unit1_id;

  insert into public.weeks (unit_id, week_number, title)
  values (unit1_id, 1, 'Week 1: Intro to Functions')
  returning id into week1_id;

  insert into public.weeks (unit_id, week_number, title)
  values (unit1_id, 2, 'Week 2: Rate of Change')
  returning id into week2_id;

  insert into public.weeks (unit_id, week_number, title)
  values (unit1_id, 3, 'Week 3: Slope-Intercept Form')
  returning id into week3_id;

  -- Published lesson: Monday of Week 3
  insert into public.lessons (week_id, day_number, title)
  values (week3_id, 1, 'Graphing Lines in Slope-Intercept Form')
  returning id into lesson1_id;

  insert into public.lesson_segments (lesson_id, segment_key, title, description, duration_minutes) values
    (lesson1_id, 'bell_ringer', 'Warm-up: Identify slope', 'Students find slope from two points on a handout.', 8),
    (lesson1_id, 'mini_lesson', 'Slope-intercept form', 'Direct instruction on y = mx + b.', 12),
    (lesson1_id, 'modeling', 'Teacher models graphing', 'Teacher works 2 examples on the board.', 12),
    (lesson1_id, 'activity', 'Partner practice', 'Students graph 6 lines in pairs on whiteboards.', 25),
    (lesson1_id, 'debrief', 'Whole-class check', 'Review common errors together.', 8),
    (lesson1_id, 'exit_ticket', 'Exit ticket', 'Graph one line independently.', 5);

  update public.lessons set
    i_do = 'I model graphing y = 2x + 3 on the board, labeling slope and y-intercept step by step.',
    we_do = 'We graph y = -1/2x + 4 together, calling on students for each step.',
    you_do_together = 'In pairs, students graph 3 more lines using whiteboards.',
    you_do = 'Students independently complete the practice set.',
    qsssa_question = 'What does the slope of a line tell you about its steepness and direction?',
    qsssa_signal = 'Thumbs up when ready to share.',
    qsssa_stem = 'The slope tells me ___ because ___.',
    qsssa_share = 'Turn and talk with a partner, then two pairs share whole-class.',
    qsssa_assess = 'Cold-call two students; check whiteboards during pair work.',
    homework = array[
      'Graph y = 3x - 2 and label the slope and y-intercept.',
      'Write the equation of a line with slope -2 and y-intercept 5.',
      'Given the graph of a line, identify its slope and y-intercept.',
      'Explain in one sentence what the "b" in y = mx + b represents.',
      'Create your own linear equation and graph it.'
    ],
    teks_ids = array[teks_linear_id, teks_quadratic_id]
  where id = lesson1_id;

  update public.lessons set status = 'published' where id = lesson1_id;

  -- Draft lesson: Tuesday of Week 3 — intentionally incomplete, to show
  -- the draft/published split (admins see it; teachers don't).
  insert into public.lessons (week_id, day_number, title)
  values (week3_id, 2, 'Point-Slope Form (draft)');

  -- Published assignment: a project, fully worked, to demonstrate the
  -- assignment list/detail views alongside the lesson content above.
  insert into public.assignments (
    unit_id, assignment_type, title, instructions, teacher_directions, rubric, answer_key
  ) values (
    unit1_id,
    'project',
    'Linear Functions Real-World Poster',
    'Choose a real-world scenario that can be modeled with a linear function (a phone plan, a savings account, a rental car cost). Create a poster that includes: the equation in slope-intercept form, a labeled graph, and a two-sentence explanation of what the slope and y-intercept mean in context.',
    'Allow 2 class periods: day 1 for scenario selection and equation-writing, day 2 for the poster itself. Provide poster board, markers, and rulers.',
    '[
      {"criterion": "Correct linear equation", "points": 15, "description": "Equation is in slope-intercept form and matches the scenario."},
      {"criterion": "Accurate, labeled graph", "points": 15, "description": "Axes labeled, scale consistent, line matches the equation."},
      {"criterion": "Slope/intercept explanation", "points": 10, "description": "Explanation correctly ties slope and y-intercept back to the real-world context."},
      {"criterion": "Neatness and clarity", "points": 5}
    ]'::jsonb,
    'Grade against the student''s own chosen scenario — there is no single correct equation. Verify the slope matches a real per-unit rate and the y-intercept matches a real starting value.'
  );
  update public.assignments set status = 'published'
  where unit_id = unit1_id and title = 'Linear Functions Real-World Poster';

  -- Draft assignment: a quiz, intentionally incomplete (no rubric/answer
  -- key yet) — same draft/published visibility split as the lesson above.
  insert into public.assignments (unit_id, assignment_type, title, instructions)
  values (
    unit1_id,
    'quiz',
    'Slope-Intercept Quick Check (draft)',
    'Answer each question using the graph or equation provided.'
  );

  -- Published assessment: a full unit test mixing question types, plus a
  -- retake variant linked back to it — demonstrates the assessment list/
  -- edit views and the original/variant relationship.
  insert into public.assessments (unit_id, title, questions, answer_key, teks_ids)
  values (
    unit1_id,
    'Unit 1 Test: Linear Functions',
    '[
      {"id": "q1", "type": "multiple_choice", "prompt": "Which equation represents a line with slope 3 and y-intercept -2?", "points": 5, "options": ["y = 3x - 2", "y = -2x + 3", "y = 3x + 2", "y = 2x - 3"], "correct_answer": "y = 3x - 2", "pairs": null},
      {"id": "q2", "type": "true_false", "prompt": "A vertical line has an undefined slope.", "points": 2, "options": null, "correct_answer": "True", "pairs": null},
      {"id": "q3", "type": "calculation", "prompt": "Find the slope between (2, 3) and (6, 11).", "points": 5, "options": null, "correct_answer": "2", "pairs": null},
      {"id": "q4", "type": "essay", "prompt": "Explain how slope and y-intercept relate to a real-world scenario of your choosing.", "points": 10, "options": null, "correct_answer": null, "pairs": null}
    ]'::jsonb,
    'Q1: A (y = 3x - 2). Q2: True. Q3: slope = (11-3)/(6-2) = 2. Q4: graded via rubric — look for a correct real-world mapping of slope (rate) and y-intercept (starting value).',
    array[teks_linear_id]
  )
  returning id into unit1_test_id;
  update public.assessments set status = 'published' where id = unit1_test_id;

  insert into public.assessments (
    unit_id, title, questions, answer_key, teks_ids, variant_type, source_assessment_id, status
  )
  select
    unit1_id,
    'Unit 1 Test: Linear Functions (Retake)',
    '[
      {"id": "q1r", "type": "multiple_choice", "prompt": "Which equation represents a line with slope -2 and y-intercept 5?", "points": 5, "options": ["y = -2x + 5", "y = 5x - 2", "y = -2x - 5", "y = 2x + 5"], "correct_answer": "y = -2x + 5", "pairs": null},
      {"id": "q2r", "type": "true_false", "prompt": "A horizontal line has a slope of zero.", "points": 2, "options": null, "correct_answer": "True", "pairs": null},
      {"id": "q3r", "type": "calculation", "prompt": "Find the slope between (1, 4) and (5, 12).", "points": 5, "options": null, "correct_answer": "2", "pairs": null},
      {"id": "q4r", "type": "essay", "prompt": "Explain how slope and y-intercept relate to a different real-world scenario than you used before.", "points": 10, "options": null, "correct_answer": null, "pairs": null}
    ]'::jsonb,
    'Q1: A (y = -2x + 5). Q2: True. Q3: slope = (12-4)/(5-1) = 2. Q4: graded via rubric.',
    array[teks_linear_id],
    'retake',
    unit1_test_id,
    'published';
end $$;
