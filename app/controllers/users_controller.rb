class UsersController < ApplicationController

  def show
    @user = User.find(params[:id])
    @tweets = Tweet.includes(:user)
  end

end
