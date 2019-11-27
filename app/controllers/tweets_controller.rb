class TweetsController < ApplicationController

  def index
    @tweet = Tweet.new
    @tweets = Tweet.includes(:user)
  end
  
  def new
    @tweet = Tweet.new
  end

  def create
    Tweet.create(post_params)
    redirect_to root_path
  end

  def show
    post = Tweet.find(params[:id])
    @tweets = Tweet.includes(:user)
  end

  private
  def post_params
    params.require(:tweet).permit(:title, :text, :image, :file).merge(user_id: current_user.id)
  end

end
