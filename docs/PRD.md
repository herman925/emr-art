# Product Requirements Document (PRD)
## EMR-ART: AI-Enhanced Observational Training Platform

**Document Version:** 2.0 (Consolidated)  
**Date:** February 26, 2026  
**Status:** Final  
**Project ID:** PRF-2026-02-001

---

## Executive Summary

### Product Overview
EMR-ART automates the creation of "spot the difference" educational modules for Hub staff training. Using AI-powered image generation (Flux 2 Pro Edit), the system generates photorealistic variations of Hub environments while maintaining structural accuracy, enabling scalable creation of observational training materials.

### Problem Statement
Currently, creating observational training modules requires:
- **Manual photo editing:** 2-4 hours per module
- **Inconsistent quality:** Human editors produce varying results
- **Scalability bottleneck:** Cannot meet growing training demands
- **High cost:** $50-100 per module in labor costs

### Solution
Automated AI-driven image variation generation that:
- Reduces module creation time by **90%**
- Maintains pedagogical rigor through structural coherence
- Scales to support **120+ schools** across multiple Hubs
- Provides audit-ready approval workflow

### Business Impact
| Metric | Target |
|--------|--------|
| Time Savings | 90% reduction in manual editing |
| Quality | <15% AI detection rate by students |
| Scalability | 120+ schools supported |
| Cost Savings | $15,000-25,000 annually |

---

## 1. Product Vision

### 1.1 Vision Statement
"To automate the creation of pedagogically-rigorous observational training modules through AI-powered image generation, enabling scalable, high-quality safety and operational training across all Hub locations."

### 1.2 Strategic Goals
1. **Automation First:** Eliminate 90% of manual photo editing tasks
2. **Quality Assurance:** Maintain structural accuracy while introducing controlled variations
3. **Operational Excellence:** Streamline workflow from photo upload to student delivery
4. **Scalability:** Support rapid expansion to new Hub locations
5. **Pedagogical Integrity:** Ensure AI variations maintain training effectiveness

---

## 2. Target Users

### 2.1 Primary Personas

#### Hub Coordinator (Primary)
- **Role:** Uploads session photos and manages content
- **Demographics:** Non-technical, education-focused
- **Goals:** Quick, easy photo upload; confidence in AI quality
- **Pain Points:** Limited technical skills, time constraints
- **Usage Frequency:** 2-5 uploads per week

#### Training Manager (Secondary)
- **Role:** Reviews and approves AI-generated variations
- **Demographics:** Quality-focused, pedagogical expertise
- **Goals:** Ensure training effectiveness, maintain standards
- **Pain Points:** Quality consistency, approval bottlenecks
- **Usage Frequency:** Daily reviews during training cycles

#### Student (End User)
- **Role:** Consumes observational training modules
- **Demographics:** Varied ages, diverse backgrounds
- **Goals:** Learn to identify safety/environmental issues
- **Pain Points:** Poor quality images, unrealistic variations
- **Usage Frequency:** 1-2 training sessions per month

---

## 3. Functional Requirements

### 3.1 Core Features

#### FR-1: Photo Upload and Ingestion
**Priority:** P0 (Critical)

- FR-1.1: Accept JPEG/PNG formats (max 20MB per image)
- FR-1.2: Capture required metadata: Session ID, Hub Location, Date
- FR-1.3: Validate image resolution (minimum 1024x1024 pixels)
- FR-1.4: Auto-orient images based on EXIF data
- FR-1.5: Provide upload progress indicator
- FR-1.6: Store original images in secure cloud storage

**Acceptance Criteria:**
- [ ] User can upload photo via Jotform in < 30 seconds
- [ ] All required fields are validated before submission
- [ ] Upload success rate > 99%

#### FR-2: AI Image Variation Generation
**Priority:** P0 (Critical)

- FR-2.1: Generate exactly **3 variations** per original photo
- FR-2.2: Maintain structural coherence score > 0.90
- FR-2.3: Apply variation prompts from predefined framework:
  - **Variation 1:** Safety equipment modification
  - **Variation 2:** Thematic props alteration
  - **Variation 3:** Environmental color changes
- FR-2.4: Process images within 60 seconds per variation
- FR-2.5: Support batch processing (minimum 5 photos simultaneously)

**Technical Parameters:**
```yaml
flux_2_pro_edit:
  image_to_image_strength: 0.35  # Preserves structure
  creativity_scale: 0.2          # Limits AI freedom
  structure_coherence: "high"    # Enforces preservation
  output_format: "jpeg"
  output_quality: 95
```

#### FR-3: Style Reference Layer
**Priority:** P1 (High)

- FR-3.1: Create and store master style reference image set
- FR-3.2: Apply style transfer to all generated variations
- FR-3.3: Maintain consistent lighting across different Hub locations
- FR-3.4: Preserve color accuracy within ±5% variance

#### FR-4: Audit and Approval Dashboard
**Priority:** P0 (Critical)

- FR-4.1: Display original photo alongside 3 variations
- FR-4.2: Highlight detected changes (overlay markup)
- FR-4.3: Provide side-by-side comparison view
- FR-4.4: Enable "Approve" / "Regenerate" / "Edit Prompt" actions
- FR-4.5: Track approval status (Pending, Approved, Rejected)
- FR-4.6: Allow bulk approval for all 3 variations
- FR-4.7: Log all approval actions with user ID and timestamp

#### FR-5: Student Module Integration
**Priority:** P0 (Critical)

- FR-5.1: Serve images via CDN for fast loading
- FR-5.2: Display 4-image grid (1 real + 3 variations) in random order
- FR-5.3: Support responsive design (mobile, tablet, desktop)
- FR-5.4: Track student responses and accuracy
- FR-5.5: Provide immediate feedback on selection
- FR-5.6: Support accessibility standards (WCAG 2.1 AA)

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
|--------|--------|
| Photo upload | < 30 seconds |
| Variation generation | < 60 seconds per variation |
| Dashboard load | < 2 seconds |
| Student module image load | < 2 seconds |
| API response time | < 500ms (95th percentile) |

### 4.2 Reliability

| Metric | Target |
|--------|--------|
| System uptime | 99.9% |
| Data durability | 99.99% |
| Backup frequency | Every 6 hours |
| Backup retention | 30 days |

### 4.3 Security

- All API endpoints require authentication
- Image uploads validated for format/size
- Rate limiting: 100 requests per minute per user
- Audit logs for all approval actions
- Data encryption at rest (AES-256) and in transit (TLS 1.3)

---

## 5. Technical Architecture

### 5.1 System Architecture

```
┌─────────────────┐
│   Jotform       │
│   (Upload UI)   │
└────────┬────────┘
         │ Webhook
         ▼
┌─────────────────┐
│   API Gateway   │
│   (Load Balancer)│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Node.js│ │ Flask  │
│  API   │ │  API   │
└───┬────┘ └───┬────┘
    └─────┬────┘
          │
    ┌─────┴──────┐
    ▼            ▼
┌────────┐  ┌──────────┐
│ Flux 2 │  │ Database │
│  API   │  │(PostgreSQL)│
└────────┘  └──────────┘
    │            │
    ▼            ▼
┌────────────────┐
│  Cloud Storage │
│  (S3/GCS)      │
└────────┬───────┘
         │ CDN
         ▼
┌─────────────────┐
│  Student Module │
│  (Frontend)     │
└─────────────────┘
```

### 5.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18+ / TypeScript / Tailwind CSS |
| **Backend** | Node.js 20+ / Express |
| **Database** | PostgreSQL 14+ |
| **Cache** | Redis |
| **Storage** | AWS S3 / CloudFront CDN |
| **AI API** | Flux 2 Pro Edit (via Replicate or BFL) |
| **Auth** | JWT / OAuth 2.0 |

### 5.3 Data Model

```sql
-- Sessions
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_number INTEGER NOT NULL,
    hub_location VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Original Photos
CREATE TABLE original_photos (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    photo_url TEXT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),
    metadata JSONB
);

-- Generated Variations
CREATE TABLE variations (
    id SERIAL PRIMARY KEY,
    original_photo_id INTEGER REFERENCES original_photos(id),
    variation_number INTEGER NOT NULL, -- 1, 2, or 3
    variation_url TEXT NOT NULL,
    prompt_used TEXT,
    generation_params JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Responses
CREATE TABLE student_responses (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    student_id VARCHAR(255),
    selected_image INTEGER,
    is_correct BOOLEAN,
    time_to_completion INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Implementation Roadmap

### Phase 1: MVP (Weeks 1-4)
**Goal:** Core infrastructure and basic functionality

**Deliverables:**
- [ ] Set up cloud infrastructure (AWS/GCP)
- [ ] Implement database schema
- [ ] Build Node.js/Flask API
- [ ] Integrate Flux 2 API
- [ ] Create basic photo upload endpoint
- [ ] Implement variation generation (single photo)
- [ ] Set up cloud storage (S3)
- [ ] Basic logging and monitoring

### Phase 2: Enhanced Features (Weeks 5-8)
**Goal:** Complete core workflow

**Deliverables:**
- [ ] Jotform webhook integration
- [ ] Batch variation generation (3 per photo)
- [ ] Style reference layer implementation
- [ ] Approval dashboard (MVP)
- [ ] Session-based image retrieval
- [ ] Student module frontend (MVP)
- [ ] Email notifications

### Phase 3: Scale & Optimize (Weeks 9-12)
**Goal:** Polish and optimize

**Deliverables:**
- [ ] Advanced dashboard features (filters, bulk actions)
- [ ] Performance optimization
- [ ] Analytics dashboard
- [ ] User management and SSO
- [ ] Mobile-responsive design
- [ ] Accessibility improvements
- [ ] Comprehensive testing

---

## 7. Success Metrics

### 7.1 Operational Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Variation Generation Time | < 60 seconds | API logs |
| System Uptime | 99.9% | Monitoring |
| Photo Processing Success | > 98% | Database |
| Approval Rate (First Attempt) | > 80% | Dashboard |
| API Response Time | < 500ms | APM |

### 7.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Visual Plausibility | < 15% detection | Student surveys |
| Structural Accuracy | 100% | Manual audit |
| Style Consistency | > 90% match | Automated scoring |

### 7.3 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time Savings | 90% reduction | Time tracking |
| Cost Savings | $15K-25K annually | Financial analysis |
| Module Creation Rate | 50 modules/week | Database count |

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Flux API rate limits | Medium | High | Queue system, fallback |
| Low structural coherence | Medium | High | Parameter tuning, QA |
| Staff adoption resistance | Medium | High | Training, gradual rollout |
| Cost overruns | Medium | Medium | Monitoring, budget alerts |

---

## 9. Budget Estimation

### 9.1 Development Costs (One-Time)
| Item | Estimate |
|------|----------|
| Backend Development | 120 hours |
| Frontend Development | 80 hours |
| QA & Testing | 40 hours |
| Project Management | 30 hours |
| **Total** | **270 hours** |

### 9.2 Operational Costs (Monthly)
| Item | Cost |
|------|------|
| Flux 2 API (100 variations) | $200-500 |
| AWS S3 Storage | $20 |
| AWS RDS (PostgreSQL) | $50 |
| Redis Cloud | $30 |
| **Total** | **$300-600/month** |

---

## 10. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Hub** | Physical training location |
| **Variation** | AI-generated "incorrect" version |
| **Style Reference** | Master visual template |
| **Structure Coherence** | Metric for structural similarity |
| **Image-to-Image Strength** | Flux parameter controlling modification |

### Appendix B: Reference Materials

- Flux API Documentation: https://docs.bfl.ml
- Jotform API: https://api.jotform.com
- AWS Best Practices: https://aws.amazon.com/architecture/well-architected/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

---

## Document Approval

| Role | Name | Date |
|------|------|------|
| Product Owner | _____________ | _______ |
| Technical Lead | _____________ | _______ |
| QA Lead | _____________ | _______ |
| Stakeholder | _____________ | _______ |

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-25 | Mission Control | Initial PRD |
| 2.0 | 2026-02-26 | Mission Control | Consolidated PRD + PRF |

---

*End of Document*
