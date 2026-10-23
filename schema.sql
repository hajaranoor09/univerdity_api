-- University API Access Management System
-- Run:  mysql -u root -p < schema.sql

DROP DATABASE IF EXISTS university_api;
CREATE DATABASE university_api CHARACTER SET utf8mb4;
USE university_api;

CREATE TABLE students (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  roll_no    VARCHAR(20)  NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL UNIQUE,
  department VARCHAR(80)  NOT NULL,
  semester   TINYINT      NOT NULL
);

CREATE TABLE teachers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL UNIQUE,
  department VARCHAR(80)  NOT NULL
);

CREATE TABLE courses (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  code  VARCHAR(20)  NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL
);

CREATE TABLE marks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT NOT NULL,
  course_id   INT NOT NULL,
  assignment  DECIMAL(5,2) NOT NULL DEFAULT 0,  -- out of 20
  midterm     DECIMAL(5,2) NOT NULL DEFAULT 0,  -- out of 30
  final_exam  DECIMAL(5,2) NOT NULL DEFAULT 0,  -- out of 50
  UNIQUE KEY uq_student_course (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- A key belongs to exactly one student OR one teacher (owner_type + owner_id)
CREATE TABLE api_keys (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  api_key       VARCHAR(64) NOT NULL UNIQUE,
  owner_type    ENUM('student','teacher') NOT NULL,
  owner_id      INT NOT NULL,
  request_limit INT NOT NULL DEFAULT 100,
  requests_used INT NOT NULL DEFAULT 0,
  status        ENUM('active','revoked') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at  TIMESTAMP NULL,
  INDEX idx_owner (owner_type, owner_id)
);

CREATE TABLE api_usage_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  api_key_id  INT NOT NULL,
  method      VARCHAR(10)  NOT NULL,
  endpoint    VARCHAR(200) NOT NULL,
  status_code SMALLINT     NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- ---------- Sample data ----------
INSERT INTO students (roll_no, name, email, department, semester) VALUES
 ('221001', 'Ali Khan',    'ali@student.au.edu.pk',   'Computer Science', 5),
 ('221002', 'Sara Ahmed',  'sara@student.au.edu.pk',  'Computer Science', 5),
 ('221003', 'Usman Tariq', 'usman@student.au.edu.pk', 'Computer Science', 5),
 ('221004', 'Hina Malik',  'hina@student.au.edu.pk',  'Computer Science', 5);

INSERT INTO teachers (name, email, department) VALUES
 ('M. Fahad Qasim', 'fahad@au.edu.pk', 'Computer Science'),
 ('Dr. Noor Zafar', 'noor@au.edu.pk',  'Computer Science');

INSERT INTO courses (code, title) VALUES
 ('CS-301L', 'Full Stack Development Lab'),
 ('CS-305',  'Database Systems'),
 ('CS-310',  'Operating Systems');

INSERT INTO marks (student_id, course_id, assignment, midterm, final_exam) VALUES
 (1,1,18,26,44),(1,2,15,22,40),(1,3,17,25,41),
 (2,1,19,28,47),(2,2,18,27,45),(2,3,16,24,42),
 (3,1,14,20,35),(3,2,13,19,33),(3,3,15,21,36),
 (4,1,17,25,43),(4,2,16,23,39),(4,3,18,26,44);

-- Pre-issued demo keys (students 3 and 4 have none: generate them in /admin)
INSERT INTO api_keys (api_key, owner_type, owner_id, request_limit) VALUES
 ('stu-ali-key-1111',   'student', 1, 20),
 ('stu-sara-key-2222',  'student', 2, 50),
 ('tch-fahad-key-3333', 'teacher', 1, 100);
