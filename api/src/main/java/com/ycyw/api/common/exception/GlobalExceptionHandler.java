package com.ycyw.api.common.exception;

import com.ycyw.api.auth.exception.UserNotFoundException;
import com.ycyw.api.common.payload.MessageResponse;
import com.ycyw.api.common.utils.MessageResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private final MessageResolver messageResolver;

    public GlobalExceptionHandler(MessageResolver messageResolver) {
        this.messageResolver = messageResolver;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String,String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(
                    java.util.stream.Collectors.toMap(fieldError ->
                            fieldError.getField(),
                            fieldError -> fieldError.getDefaultMessage(),
                            (a,b) -> a
                    )
                );
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(WrongParametersException.class)
    public ResponseEntity<MessageResponse> handleWrongParameters(WrongParametersException ex){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new MessageResponse(ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, List<String>>> handleConflict(ConflictException ex){
        List<String> errors = ex.getMessageKeys()
                .stream()
                .map(key -> messageResolver.get(key))
                .toList();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("errors", errors));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<MessageResponse> handleUserNotFound(UserNotFoundException ex){
        String message = messageResolver.get(ex.getMessage(),
                new Object[]{ex.getLogin()});
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse(message));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<MessageResponse> handleBadCredentials(BadCredentialsException ex){
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new MessageResponse(messageResolver.get("auth.login.badCredentials")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<MessageResponse> handleWrongRequest(Exception ex){
        return ResponseEntity.badRequest().body(new MessageResponse("Wrong request"));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMediaType(
            HttpMediaTypeNotSupportedException ex) {

        return ResponseEntity
                .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE) // 415
                .body(Map.of(
                        "error", "unsupported_media_type",
                        "message", ex.getMessage()
                ));
    }


    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            ResourceNotFoundException ex
    ) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                        "error", "not_found",
                        "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : messageResolver.get("error.unauthorized");
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error", "forbidden",
                        "message", message
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(
            Exception ex) {

        ex.printStackTrace();

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "error", "internal_error",
                        "message", "Une erreur interne est survenue"
                ));
    }
}
