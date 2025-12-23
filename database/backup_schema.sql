--
-- PostgreSQL database dump
--

\restrict cluOkaGgaZSXhc2Iye2ety14zTgyyReHjRT0hpFbWxSKLRWdEIDxb65wW3mK1zK

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(50) DEFAULT 'info'::character varying,
    created_by character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    id_result integer NOT NULL,
    action character varying(50) NOT NULL,
    username character varying(50) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    details jsonb
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: chat_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_history (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    id_domain integer NOT NULL,
    role character varying(20) NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_history_role_check CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('assistant'::character varying)::text])))
);


--
-- Name: chat_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_history_id_seq OWNED BY public.chat_history.id;


--
-- Name: domain_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_notes (
    id integer NOT NULL,
    id_domain integer NOT NULL,
    note_text text NOT NULL,
    created_by character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: domain_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.domain_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: domain_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.domain_notes_id_seq OWNED BY public.domain_notes.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id_feedback integer NOT NULL,
    messages text NOT NULL,
    sender character varying(100) NOT NULL,
    waktu_pengiriman timestamp with time zone DEFAULT now()
);


--
-- Name: feedback_id_feedback_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_id_feedback_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_id_feedback_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_id_feedback_seq OWNED BY public.feedback.id_feedback;


--
-- Name: generated_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_domains (
    id_domain integer NOT NULL,
    url text,
    title character varying(255),
    domain character varying(255),
    image_base64 text,
    date_generated timestamp with time zone DEFAULT now(),
    is_dummy boolean DEFAULT false
);


--
-- Name: generated_domains_id_domain_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generated_domains_id_domain_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generated_domains_id_domain_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generated_domains_id_domain_seq OWNED BY public.generated_domains.id_domain;


--
-- Name: generator_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generator_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text NOT NULL,
    updated_by character varying(50),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: generator_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generator_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generator_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generator_settings_id_seq OWNED BY public.generator_settings.id;


--
-- Name: history_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history_log (
    id integer NOT NULL,
    id_result integer NOT NULL,
    "time" timestamp with time zone DEFAULT now(),
    text text NOT NULL
);


--
-- Name: history_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.history_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: history_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.history_log_id_seq OWNED BY public.history_log.id;


--
-- Name: object_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.object_detection (
    id_detection text NOT NULL,
    id_domain integer NOT NULL,
    label boolean,
    confidence_score numeric(4,1),
    image_detected_base64 text,
    bounding_box jsonb,
    ocr jsonb,
    model_version text,
    processed_at timestamp with time zone DEFAULT now()
);


--
-- Name: reasoning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reasoning (
    id_reasoning integer NOT NULL,
    id_domain integer NOT NULL,
    label boolean,
    context text,
    confidence_score numeric(4,1),
    model_version text,
    processed_at timestamp with time zone DEFAULT now()
);


--
-- Name: reasoning_id_reasoning_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reasoning_id_reasoning_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reasoning_id_reasoning_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reasoning_id_reasoning_seq OWNED BY public.reasoning.id_reasoning;


--
-- Name: results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.results (
    id_results integer NOT NULL,
    id_domain integer NOT NULL,
    id_reasoning integer,
    id_detection text,
    url text,
    keywords text,
    reasoning_text text,
    image_final_path text,
    label_final boolean,
    final_confidence numeric(4,1),
    status character varying(20) DEFAULT 'unverified'::character varying,
    flagged boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    modified_by character varying(50),
    modified_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(50),
    verified_by character varying(50),
    verified_at timestamp with time zone,
    is_manual boolean DEFAULT false
);


--
-- Name: results_id_results_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.results_id_results_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: results_id_results_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.results_id_results_seq OWNED BY public.results.id_results;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(100),
    phone character varying(20),
    role character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    dark_mode boolean DEFAULT false,
    compact_mode boolean DEFAULT false,
    generator_keywords text DEFAULT ''::text,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('verifikator'::character varying)::text, ('administrator'::character varying)::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: chat_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_history ALTER COLUMN id SET DEFAULT nextval('public.chat_history_id_seq'::regclass);


--
-- Name: domain_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_notes ALTER COLUMN id SET DEFAULT nextval('public.domain_notes_id_seq'::regclass);


--
-- Name: feedback id_feedback; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id_feedback SET DEFAULT nextval('public.feedback_id_feedback_seq'::regclass);


--
-- Name: generated_domains id_domain; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains ALTER COLUMN id_domain SET DEFAULT nextval('public.generated_domains_id_domain_seq'::regclass);


--
-- Name: generator_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generator_settings ALTER COLUMN id SET DEFAULT nextval('public.generator_settings_id_seq'::regclass);


--
-- Name: history_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_log ALTER COLUMN id SET DEFAULT nextval('public.history_log_id_seq'::regclass);


--
-- Name: reasoning id_reasoning; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasoning ALTER COLUMN id_reasoning SET DEFAULT nextval('public.reasoning_id_reasoning_seq'::regclass);


--
-- Name: results id_results; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results ALTER COLUMN id_results SET DEFAULT nextval('public.results_id_results_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: generator_settings generator_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generator_settings
    ADD CONSTRAINT generator_settings_setting_key_key UNIQUE (setting_key);


--
-- PostgreSQL database dump complete
--

\unrestrict cluOkaGgaZSXhc2Iye2ety14zTgyyReHjRT0hpFbWxSKLRWdEIDxb65wW3mK1zK

