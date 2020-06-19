import { Component, OnInit, OnDestroy } from '@angular/core';
import { CourseScoreCalculationService } from 'app/overview/course-score-calculation.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { Course } from 'app/entities/course.model';
import { Exam } from 'app/entities/exam.model';
import * as moment from 'moment';
import { JhiWebsocketService } from 'app/core/websocket/websocket.service';
import { ExamParticipationService } from 'app/exam/participate/exam-participation.service';
import { StudentExam } from 'app/entities/student-exam.model';
import { ExerciseType } from 'app/entities/exercise.model';

@Component({
    selector: 'jhi-exam-participation',
    templateUrl: './exam-participation.component.html',
    styleUrls: ['./exam-participation.scss'],
})
export class ExamParticipationComponent implements OnInit, OnDestroy {
    readonly TEXT = ExerciseType.TEXT;
    readonly QUIZ = ExerciseType.QUIZ;
    readonly MODELING = ExerciseType.MODELING;

    course: Course | null;
    courseId: number;
    private paramSubscription: Subscription;
    exam: Exam;
    studentExam: StudentExam;
    examId: number;
    unsavedChanges = false;
    disconnected = false;
    activeExercise = 0;

    /**
     * Websocket channels
     */
    onConnected: () => void;
    onDisconnected: () => void;

    constructor(
        private courseCalculationService: CourseScoreCalculationService,
        private jhiWebsocketService: JhiWebsocketService,
        private route: ActivatedRoute,
        private examParticipationService: ExamParticipationService,
    ) {}

    /**
     * initializes courseId and course
     */
    ngOnInit(): void {
        this.paramSubscription = this.route.parent!.params.subscribe((params) => {
            this.courseId = parseInt(params['courseId'], 10);
            this.examId = parseInt(params['examId'], 10);
            // set examId and courseId in service
            this.examParticipationService.courseId = this.courseId;
            this.examParticipationService.examId = this.examId;
        });

        // load exam like this until service is ready
        this.course = this.courseCalculationService.getCourse(this.courseId);
        this.exam = this.course!.exams.filter((exam) => exam.id === this.examId)[0]!;
        this.examParticipationService.getStudentExam().subscribe((studentExam) => {
            this.studentExam = studentExam;
        });
        this.initLiveMode();
    }

    /**
     * check if exam is over
     */
    isOver(): boolean {
        if (!this.exam) {
            return false;
        }
        return this.exam.endDate ? moment(this.exam.endDate).isBefore(moment()) : false;
    }

    /**
     * check if exam is visible
     */
    isVisible(): boolean {
        if (!this.exam) {
            return false;
        }
        return this.exam.visibleDate ? moment(this.exam.visibleDate).isBefore(moment()) : false;
    }

    /**
     * check if exam has started
     */
    isActive(): boolean {
        if (!this.exam) {
            return false;
        }
        return this.exam.startDate ? moment(this.exam.startDate).isBefore(moment()) : false;
    }

    ngOnDestroy(): void {
        this.paramSubscription.unsubscribe();
    }
    initLiveMode() {
        // listen to connect / disconnect events
        this.onConnected = () => {
            if (this.disconnected) {
                // if the disconnect happened during the live exam and there are unsaved changes, we trigger a selection changed event to save the submission on the server
                if (this.unsavedChanges) {
                    // ToDo: save submission on server
                }
            }
            this.disconnected = false;
        };
        this.jhiWebsocketService.bind('connect', () => {
            this.onConnected();
        });
        this.onDisconnected = () => {
            this.disconnected = true;
        };
        this.jhiWebsocketService.bind('disconnect', () => {
            this.onDisconnected();
        });
    }
}
