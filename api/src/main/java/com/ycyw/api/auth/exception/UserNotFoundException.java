package com.ycyw.api.auth.exception;

import com.ycyw.api.common.exception.ResourceNotFoundException;

public class UserNotFoundException extends ResourceNotFoundException {
    private final String login;
    public UserNotFoundException(String login) {
        super("auth.login.user.notfound");
        this.login = login;
    }

    public UserNotFoundException() {
        super("auth.login.user.notfound_by_id");
        this.login = "";
    }

    public String getLogin() {
        return login;
    }
}
