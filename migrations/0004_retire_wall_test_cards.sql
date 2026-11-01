-- Retire the original wall fixtures. Keep their rows recoverable and leave
-- visitor submissions untouched; both the tester name and message must match.
WITH fixtures(name, message) AS (
  VALUES
    ('tester1', 'good thing number 1'),
    ('tester2', 'good thing number 2'),
    ('tester3', 'good thing number 3'),
    ('tester4', 'good thing number 4'),
    ('tester5', 'good thing number 5'),
    ('tester6', 'good thing number 6'),
    ('tester7', 'good thing number 7'),
    ('tester8', 'good thing number 8'),
    ('tester9', 'good thing number 9'),
    ('tester10', 'good thing number 10'),
    ('tester11', 'good thing number 11'),
    ('tester12', 'good thing number 12')
)
UPDATE posts SET hidden = 1
WHERE (name, message) IN (SELECT name, message FROM fixtures);
